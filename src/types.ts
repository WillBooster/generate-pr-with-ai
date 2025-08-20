/**
 * Represents basic user information with login
 */
export interface UserLogin {
  /** The author's GitHub username */
  login: string;
}

/**
 * Represents a simplified comment for issue processing
 */
export interface IssueComment {
  /** The comment author's GitHub username */
  author: string;
  codeLocation?: string;
  codeContent?: string;
  reviewState?: string;
  /** The comment's content */
  body: string;
}

/**
 * Represents repository information
 */
export interface RepositoryInfo {
  /** The repository owner's username */
  owner: string;
  /** The repository name */
  repo: string;
}

/**
 * Represents basic label information
 */
export interface LabelInfo {
  /** The label's name */
  name: string;
}

/**
 * Represents a simple comment structure for Octokit responses
 */
export interface SimpleComment {
  /** The comment author's GitHub username */
  author: string;
  /** The comment's content */
  body: string;
  /** When the comment was created */
  createdAt: string;
}

/**
 * Represents pull request creation parameters
 */
export interface PullRequestParams {
  /** Pull request title */
  title: string;
  /** Pull request body/description */
  body: string;
  /** Source branch */
  head: string;
  /** Target branch */
  base: string;
}

/**
 * Represents a pull request review
 */
export interface PullRequestReview {
  /** The review author */
  user: UserLogin;
  /** The review state */
  state: string;
  /** The review body/content */
  body: string;
  /** When the review was submitted */
  submitted_at: string;
}

/**
 * Represents review thread comment from GraphQL
 */
export interface ReviewThreadComment {
  /** The comment author */
  author: UserLogin;
  /** The comment content */
  body: string;
  /** File path */
  path: string;
  /** Line number */
  line: number;
  /** Diff context */
  diffHunk: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Represents a review thread
 */
export interface ReviewThread {
  /** Whether the thread is resolved */
  isResolved: boolean;
  /** Comments in the thread */
  comments: {
    nodes: ReviewThreadComment[];
  };
}

/**
 * Represents GraphQL response for pull request review threads
 */
export interface PullRequestReviewThreadsResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        nodes: ReviewThread[];
      };
    };
  };
}

/**
 * Represents processed issue information for AI processing
 */
export interface IssueInfo {
  /** The issue author's GitHub username */
  author: string;
  /** The issue title */
  title: string;
  /** The cleaned issue description */
  description: string;
  /** Simplified comments on the issue */
  comments: IssueComment[];
  /** Code changes (only present for PRs with diff content) */
  code_changes?: string;
  /** Referenced issues and pull requests */
  referenced_issues?: IssueInfo[];
}

/**
 * Represents the level of reasoning effort for LLM API calls
 *
 * - 'low': Faster responses with less reasoning
 * - 'medium': Balanced reasoning and response time
 * - 'high': More thorough reasoning (may be slower and use more tokens)
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Represents the coding tool to use
 *
 * - 'aider': Use Aider for code changes
 * - 'claude-code': Use Claude Code for code changes
 * - 'codex-cli': Use Codex CLI for code changes
 * - 'gemini-cli': Use Gemini CLI for code changes
 */
export type CodingTool = 'aider' | 'claude-code' | 'codex-cli' | 'gemini-cli';

/**
 * Represents the actual Node.js runtime commands (without aliases)
 *
 * - 'npx': Use npx (npm package runner)
 * - 'bunx': Use bunx (bun package runner)
 */
export type NodeRuntimeActual = 'npx' | 'bunx';

/**
 * Represents the Node.js runtime to use for running tools (including aliases)
 *
 * - 'node': Alias for 'npx' - uses npm package runner
 * - 'bun': Alias for 'bunx' - uses bun package runner
 * - 'npx': Use npx (npm package runner)
 * - 'bunx': Use bunx (bun package runner)
 */
export type NodeRuntime = 'node' | 'bun' | NodeRuntimeActual;
