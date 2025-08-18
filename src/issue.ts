import type { MainOptions } from './main.js';
import { runCommand } from './spawn.js';
import { normalizeNewLines, removeRegexPattern, stripHtmlComments, stripMetadataSections } from './text.js';
import type {
  GitHubComment,
  GitHubIssue,
  GitHubReview,
  GitHubReviewComment,
  IssueComment,
  IssueInfo,
} from './types.js';

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

  const { stdout: issueResult } = await runCommand(
    'gh',
    ['issue', 'view', issueNumber.toString(), '--json', 'author,title,body,labels,comments,url'],
    { ignoreExitStatus: true }
  );
  if (!issueResult) {
    return;
  }
  const issue: GitHubIssue = JSON.parse(issueResult);

  // Extract issue/PR references from the issue body and comments
  const allText = [issue.body, ...issue.comments.map((c) => c.body)].join('\n');
  const referencedNumbers = extractIssueReferences(allText);

  const rawBody = stripHtmlComments(issue.body);
  const processedBody = issue.url?.includes('/pull/') ? stripMetadataSections(rawBody) : rawBody;
  const description = removeRegexPattern(processedBody, options.removePattern || '');
  const commentsWithDate: IssueCommentWithDate[] = issue.comments.map((c: GitHubComment) => ({
    author: c.author.login,
    body: normalizeNewLines(c.body),
    createdAt: new Date(c.createdAt).getTime(),
  }));

  const issueInfo: IssueInfo = {
    author: issue.author.login,
    title: issue.title,
    description: normalizeNewLines(description),
    comments: [], // Will be populated after sorting
  };

  if (issue.url?.includes('/pull/') && !isReferenced) {
    const { stdout: prDiff } = await runCommand('gh', ['pr', 'diff', issueNumber.toString()], {
      ignoreExitStatus: true,
      truncateStdout: true,
    });
    if (prDiff.trim()) {
      issueInfo.code_changes = processDiffContent(prDiff.trim());
    }

    // Fetch PR review threads using GraphQL to check resolved status
    const graphqlQuery = `
      query($owner: String!, $repo: String!, $pr: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pr) {
            reviewThreads(first: 100) {
              nodes {
                isResolved
                comments(first: 100) {
                  nodes {
                    author {
                      login
                    }
                    body
                    path
                    line
                    diffHunk
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Get repository owner and name from the current repo
    const { stdout: repoInfo } = await runCommand('gh', ['repo', 'view', '--json', 'owner,name'], {
      ignoreExitStatus: true,
    });

    let useGraphQL = false;
    let owner = '';
    let repoName = '';

    if (repoInfo.trim()) {
      try {
        const repo = JSON.parse(repoInfo);
        owner = repo.owner.login;
        repoName = repo.name;
        useGraphQL = true;
      } catch (error) {
        console.warn('Failed to parse repo info, falling back to REST API:', error);
      }
    }

    if (useGraphQL) {
      // Try GraphQL API first to get resolved status
      const { stdout: graphqlResult } = await runCommand(
        'gh',
        [
          'api',
          'graphql',
          '-f',
          `query=${graphqlQuery}`,
          '-F',
          `owner=${owner}`,
          '-F',
          `repo=${repoName}`,
          '-F',
          `pr=${issueNumber}`,
        ],
        { ignoreExitStatus: true }
      );

      if (graphqlResult.trim()) {
        try {
          const graphqlData = JSON.parse(graphqlResult);
          const reviewThreads = graphqlData.data?.repository?.pullRequest?.reviewThreads?.nodes || [];

          // Process only unresolved review threads
          for (const thread of reviewThreads) {
            if (!thread.isResolved && thread.comments?.nodes) {
              for (const comment of thread.comments.nodes) {
                if (!comment.author || !comment.body) continue;

                // Extract code content from diff hunk
                let codeContent = '';
                if (comment.diffHunk) {
                  const lines = comment.diffHunk.split('\n');
                  codeContent =
                    lines
                      .find(
                        (line: string) =>
                          (line.startsWith('+') || line.startsWith('-')) &&
                          !line.startsWith('@@') &&
                          line.trim().length > 1
                      )
                      ?.trim() || '';
                }

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
          }
        } catch (error) {
          console.warn('Failed to parse GraphQL result, falling back to REST API:', error);
          useGraphQL = false;
        }
      } else {
        useGraphQL = false;
      }
    }

    // Fallback to REST API if GraphQL fails or is not available
    if (!useGraphQL) {
      const { stdout: reviewCommentsResult } = await runCommand(
        'gh',
        ['api', `repos/{owner}/{repo}/pulls/${issueNumber}/comments`],
        { ignoreExitStatus: true }
      );
      if (reviewCommentsResult.trim()) {
        try {
          const reviewComments: GitHubReviewComment[] = JSON.parse(reviewCommentsResult);
          // Add all review comments (can't filter resolved ones with REST API)
          const reviewCommentsAsIssueComments: IssueCommentWithDate[] = reviewComments.map((rc) => {
            let codeContent = '';
            if (rc.diff_hunk) {
              const lines = rc.diff_hunk.split('\n');
              codeContent =
                lines
                  .find(
                    (line: string) =>
                      (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('@@') && line.trim().length > 1
                  )
                  ?.trim() || '';
            }
            return {
              author: rc.user.login,
              codeLocation: `${rc.path}:${rc.line}`,
              codeContent,
              body: normalizeNewLines(rc.body),
              createdAt: new Date(rc.created_at).getTime(),
            };
          });
          commentsWithDate.push(...reviewCommentsAsIssueComments);
        } catch (error) {
          console.warn('Failed to parse PR review comments:', error);
        }
      }
    }

    // Fetch PR reviews (overall review comments)
    const { stdout: reviewsResult } = await runCommand(
      'gh',
      ['api', `repos/{owner}/{repo}/pulls/${issueNumber}/reviews`],
      { ignoreExitStatus: true }
    );
    if (reviewsResult.trim()) {
      try {
        const reviews: GitHubReview[] = JSON.parse(reviewsResult);
        // Add review result comments to the regular comments
        const reviewResultComments: IssueCommentWithDate[] = reviews.map((review) => ({
          author: review.user.login,
          reviewState: review.state,
          body: normalizeNewLines(review.body),
          createdAt: new Date(review.submitted_at).getTime(),
        }));
        commentsWithDate.push(...reviewResultComments);
      } catch (error) {
        // Ignore JSON parsing errors for reviews
        console.warn('Failed to parse PR reviews:', error);
      }
    }
  }

  if (referencedNumbers.length > 0) {
    const referencedIssuesPromises = referencedNumbers.map((num) =>
      fetchIssueData(num, processedIssues, options, true)
    );
    const referencedIssues = (await Promise.all(referencedIssuesPromises)).filter(
      (issue): issue is IssueInfo => !!issue
    );
    if (referencedIssues.length > 0) {
      issueInfo.referenced_issues = referencedIssues;
    }
  }

  // Sort comments by creation date (oldest first) and remove createdAt field
  issueInfo.comments = commentsWithDate
    .filter((c) => c.body)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ createdAt, ...comment }) => comment);

  return issueInfo;
}

function extractIssueReferences(text: string): number[] {
  const regex = /(?:^|\s)#(\d+)/g;
  const numbers: number[] = [];
  for (;;) {
    const match = regex.exec(text);
    if (!match) break;

    numbers.push(Number.parseInt(match[1], 10));
  }
  return [...new Set(numbers)]; // Remove duplicates
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
