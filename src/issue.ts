import type { MainOptions } from './main.js';
import { getIssue, getPullRequestDiff, getPullRequestReviews, getPullRequestReviewThreads } from './octokit.js';
import { normalizeNewLines, removeRegexPattern, stripHtmlComments, stripMetadataSections } from './text.js';
import type { IssueComment, IssueInfo, UserLogin } from './types.js';

// Temporary interface for sorting comments with date information
interface IssueCommentWithDate extends IssueComment {
  createdAt: number;
}

export async function createIssueInfo(options: MainOptions): Promise<IssueInfo> {
  const processedIssues = new Set<number>();
  const issueInfo = await fetchIssueData(options.issueNumber, processedIssues, options, false);
  if (!issueInfo) {
    throw new Error(`Failed to fetch issue data for issue #${options.issueNumber}`);
  }
  return issueInfo;
}

async function fetchPRDiff(issueNumber: number, issueInfo: IssueInfo): Promise<void> {
  try {
    const prDiff = await getPullRequestDiff(issueNumber);
    if (!prDiff.trim()) return;
    issueInfo.code_changes = processDiffContent(prDiff.trim());
  } catch (error) {
    console.warn('Failed to fetch PR diff:', error);
  }
}

async function fetchIssueData(
  issueNumber: number,
  processedIssues: Set<number>,
  options: MainOptions,
  isReferenced = false
): Promise<IssueInfo | undefined> {
  if (processedIssues.has(issueNumber)) {
    return;
  }
  processedIssues.add(issueNumber);

  let issue: Awaited<ReturnType<typeof getIssue>>;
  try {
    issue = await getIssue(issueNumber);
  } catch (error) {
    console.warn(`Failed to fetch issue #${issueNumber}:`, error);
    return;
  }

  // Extract issue/PR references from the issue body and comments
  const allText = [issue.body, ...issue.comments.map((c) => c.body)].join('\n');
  const referencedNumbers = extractIssueReferences(allText);

  const rawBody = stripHtmlComments(issue.body);
  const processedBody = issue.url?.includes('/pull/') ? stripMetadataSections(rawBody) : rawBody;
  const description = removeRegexPattern(processedBody, options.removePattern || '');
  const commentsWithDate: IssueCommentWithDate[] = issue.comments.map((c) => ({
    author: c.author,
    body: normalizeNewLines(c.body),
    createdAt: new Date(c.createdAt).getTime(),
  }));

  const issueInfo: IssueInfo = {
    author: issue.author,
    title: issue.title,
    description: normalizeNewLines(description),
    comments: [], // Will be populated after sorting
  };

  if (issue.url?.includes('/pull/') && !isReferenced) {
    await fetchPRDiff(issueNumber, issueInfo);
    await fetchPRReviewThreads(issueNumber, commentsWithDate);
    await fetchPRReviews(issueNumber, commentsWithDate);
  }

  if (referencedNumbers.length > 0) {
    await fetchReferencedIssues(referencedNumbers, processedIssues, options, issueInfo);
  }

  // Sort comments by creation date (oldest first) and remove createdAt field
  issueInfo.comments = commentsWithDate
    .filter((c) => c.body)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ createdAt, ...comment }) => comment);

  return issueInfo;
}

async function fetchPRReviewThreads(issueNumber: number, commentsWithDate: IssueCommentWithDate[]): Promise<void> {
  try {
    const graphqlData = await getPullRequestReviewThreads(issueNumber);
    const reviewThreads = graphqlData?.repository?.pullRequest?.reviewThreads?.nodes || [];

    for (const thread of reviewThreads) {
      if (!thread.isResolved && thread.comments?.nodes) {
        processReviewThreadComments(thread.comments.nodes, commentsWithDate);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch PR review threads:', error);
  }
}

function processReviewThreadComments(
  comments: Array<{
    author?: UserLogin;
    body?: string;
    path?: string;
    line?: number;
    diffHunk?: string;
    createdAt: string;
  }>,
  commentsWithDate: IssueCommentWithDate[]
): void {
  for (const comment of comments) {
    if (!comment.author || !comment.body) continue;

    const codeContent = extractCodeFromDiffHunk(comment.diffHunk);
    const reviewComment: IssueCommentWithDate = {
      author: comment.author.login,
      codeLocation: comment.path && comment.line ? `${comment.path}:${comment.line}` : undefined,
      codeContent: codeContent || undefined,
      body: normalizeNewLines(comment.body),
      createdAt: new Date(comment.createdAt).getTime(),
    };

    // Remove undefined properties
    Object.keys(reviewComment).forEach((key) => {
      if (reviewComment[key as keyof IssueCommentWithDate] === undefined) {
        delete reviewComment[key as keyof IssueCommentWithDate];
      }
    });

    commentsWithDate.push(reviewComment);
  }
}

function extractCodeFromDiffHunk(diffHunk: string | undefined): string {
  if (!diffHunk) return '';

  const lines = diffHunk.split('\n');
  const codeLine = lines.find(
    (line: string) => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('@@') && line.trim().length > 1
  );
  return codeLine?.trim() || '';
}

async function fetchPRReviews(issueNumber: number, commentsWithDate: IssueCommentWithDate[]): Promise<void> {
  try {
    const reviews = await getPullRequestReviews(issueNumber);
    const reviewResultComments: IssueCommentWithDate[] = reviews.map((review) => ({
      author: review.user.login,
      reviewState: review.state,
      body: normalizeNewLines(review.body),
      createdAt: new Date(review.submitted_at).getTime(),
    }));
    commentsWithDate.push(...reviewResultComments);
  } catch (error) {
    console.warn('Failed to fetch PR reviews:', error);
  }
}

function extractIssueReferences(text: string): number[] {
  const regex = /(?:^|\s)#(\d+)/g;
  const numbers: number[] = [];
  for (;;) {
    const match = regex.exec(text);
    if (!match) break;

    const number = Number.parseInt(match[1] ?? '', 10);
    if (Number.isInteger(number)) {
      numbers.push(number);
    }
  }
  return [...new Set(numbers)]; // Remove duplicates
}

async function fetchReferencedIssues(
  referencedNumbers: number[],
  processedIssues: Set<number>,
  options: MainOptions,
  issueInfo: IssueInfo
): Promise<void> {
  const referencedIssuesPromises = referencedNumbers.map((num) => fetchIssueData(num, processedIssues, options, true));
  const referencedIssues = (await Promise.all(referencedIssuesPromises)).filter((issue): issue is IssueInfo => !!issue);

  if (referencedIssues.length === 0) return;

  issueInfo.referenced_issues = referencedIssues;
}

/**
 * Process diff content to handle large diffs by truncating or omitting large fragments
 */
function processDiffContent(diffContent: string): string {
  const MAX_TOTAL_DIFF_SIZE = 50000;
  const MAX_FILE_DIFF_SIZE = 10000;
  const LARGE_FILE_PATTERNS = [
    /^diff --git a\/dist\//m,
    /^diff --git a\/build\//m,
    /^diff --git a\/.*\.bundle\./m,
    /^diff --git a\/.*\.min\./m,
    /^diff --git a\/node_modules\//m,
  ];

  // If the entire diff is small enough, return as-is
  if (diffContent.length <= MAX_TOTAL_DIFF_SIZE) {
    return diffContent;
  }

  // Split diff into individual file sections
  const fileSections = diffContent.split(/(?=^diff --git)/m);
  const processedSections: string[] = [];
  let totalSize = 0;

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const isLargeFile = LARGE_FILE_PATTERNS.some((pattern) => pattern.test(section));

    if (isLargeFile) {
      // For large/bundled files, include only the header and a truncation notice
      const lines = section.split('\n');
      const headerLines = lines.slice(0, 4); // diff --git, index, ---, +++
      const truncatedSection = [
        ...headerLines,
        '@@ ... @@',
        '... (large bundled/compiled file diff truncated) ...',
        '',
      ].join('\n');

      processedSections.push(truncatedSection);
      totalSize += truncatedSection.length;
    } else if (section.length > MAX_FILE_DIFF_SIZE) {
      // For other large files, truncate but keep some content
      const truncatedSection = `${section.slice(0, MAX_FILE_DIFF_SIZE)}\n... (diff truncated) ...\n`;
      processedSections.push(truncatedSection);
      totalSize += truncatedSection.length;
    } else {
      // Small files, include as-is
      processedSections.push(section);
      totalSize += section.length;
    }

    // Stop if we're approaching the total size limit
    if (totalSize > MAX_TOTAL_DIFF_SIZE * 0.9) {
      processedSections.push('\n... (remaining diffs truncated) ...\n');
      break;
    }
  }

  return processedSections.join('');
}
