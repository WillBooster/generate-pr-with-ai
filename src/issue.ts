import YAML from 'yaml';
import type { MainOptions } from './main.js';
import { findDistinctFence } from './markdown.js';
import { runCommand } from './spawn.js';
import type { GitHubComment, GitHubIssue, GitHubReviewComment, IssueInfo } from './types.js';
import { stripHtmlComments } from './utils.js';
import { yamlStringifyOptions } from './yaml.js';

export async function createIssueInfo(options: MainOptions): Promise<IssueInfo> {
  const processedIssues = new Set<number>();
  const issueInfo = await fetchIssueData(options.issueNumber, processedIssues);
  if (!issueInfo) {
    throw new Error(`Failed to fetch issue data for issue #${options.issueNumber}`);
  }
  return issueInfo;
}

async function fetchIssueData(
  issueNumber: number,
  processedIssues: Set<number>,
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

  const issueInfo: IssueInfo = {
    author: issue.author.login,
    title: issue.title,
    description: stripHtmlComments(issue.body),
    comments: issue.comments.map((c: GitHubComment) => ({
      author: c.author.login,
      body: c.body,
    })),
  };

  if (issue.url?.includes('/pull/') && !isReferenced) {
    const { stdout: prDiff } = await runCommand('gh', ['pr', 'diff', issueNumber.toString()], {
      ignoreExitStatus: true,
      truncateStdout: true,
    });
    if (prDiff.trim()) {
      issueInfo.code_changes = processDiffContent(prDiff.trim());
    }

    // Fetch PR review comments
    const { stdout: reviewCommentsResult } = await runCommand(
      'gh',
      ['api', `repos/{owner}/{repo}/pulls/${issueNumber}/comments`],
      { ignoreExitStatus: true }
    );
    if (reviewCommentsResult.trim()) {
      try {
        const reviewComments: GitHubReviewComment[] = JSON.parse(reviewCommentsResult);
        // Add review comments to the regular comments
        const reviewCommentsAsIssueComments = reviewComments.map((rc) => {
          // Extract the code from the diff_hunk if available
          let codeContext = '';
          if (rc.diff_hunk) {
            // Find the line that was commented on (marked with + or -)
            const lines = rc.diff_hunk.split('\n');
            // Look for the line that contains the actual code change
            // The commented line is usually the one with + or - that contains actual code
            codeContext =
              lines
                .find(
                  (line) =>
                    (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('@@') && line.trim().length > 1 // Make sure it's not just a + or - symbol
                )
                ?.trim() || '';
          }
          const reviewCommentYaml = YAML.stringify(
            { codeCommented: codeContext, comment: rc.body },
            yamlStringifyOptions
          ).trim();
          const yamlFence = findDistinctFence(reviewCommentYaml);
          return {
            author: rc.user.login,
            body: `Review comment on \`${rc.path}:${rc.line}\`:

${yamlFence}yaml
${reviewCommentYaml}
${yamlFence}`,
          };
        });
        issueInfo.comments.push(...reviewCommentsAsIssueComments);
      } catch (error) {
        // Ignore JSON parsing errors for review comments
        console.warn('Failed to parse PR review comments:', error);
      }
    }
  }

  if (referencedNumbers.length > 0) {
    const referencedIssuesPromises = referencedNumbers.map((num) => fetchIssueData(num, processedIssues, true));
    const referencedIssues = (await Promise.all(referencedIssuesPromises)).filter(
      (issue): issue is IssueInfo => !!issue
    );
    if (referencedIssues.length > 0) {
      issueInfo.referenced_issues = referencedIssues;
    }
  }

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
