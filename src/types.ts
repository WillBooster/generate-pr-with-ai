/**
 * Represents basic user information with login
 */
export interface UserLogin {
  /** The author's GitHub username */
  login: string;
}

/**
 * Represents a GitHub user
 */
export interface GitHubUser extends UserLogin {
  /** The user's GitHub ID */
  id: string;
  /** Whether the user is a bot */
  is_bot: boolean;
  /** The user's full name */
  name?: string;
}

/**
 * Represents a comment author with minimal information
 * @deprecated Use UserLogin instead
 */
export interface CommentAuthor extends UserLogin {}

/**
 * Represents users who reacted with a specific reaction
 */
export interface ReactionUsers {
  /** The total count of users who reacted */
  totalCount: number;
}

/**
 * Represents a reaction group on a comment or issue
 */
export interface ReactionGroup {
  /** The type of reaction (e.g., THUMBS_UP, LAUGH) */
  content: string;
  /** Users who reacted */
  users: ReactionUsers;
}

/**
 * Represents a GitHub issue comment
 */
export interface GitHubComment {
  /** The comment's unique ID */
  id: string;
  /** The comment's author */
  author: CommentAuthor;
  /** The author's association with the repository */
  authorAssociation: string;
  /** The comment's content */
  body: string;
  /** When the comment was created */
  createdAt: string;
  /** Whether the comment includes an edit made at creation time */
  includesCreatedEdit: boolean;
  /** Whether the comment is minimized */
  isMinimized: boolean;
  /** The reason the comment was minimized, if applicable */
  minimizedReason: string;
  /** Reaction groups on the comment */
  reactionGroups: ReactionGroup[];
  /** URL to the comment */
  url: string;
  /** Whether the current viewer authored the comment */
  viewerDidAuthor: boolean;
}

/**
 * Represents a GitHub label
 */
export interface GitHubLabel {
  /** The label's unique ID */
  id: string;
  /** The label's name */
  name: string;
  /** The label's description (optional) */
  description?: string;
  /** The label's color (hex code without #) */
  color: string;
}

/**
 * Represents a GitHub issue
 */
export interface GitHubIssue {
  /** The issue's author */
  author: GitHubUser;
  /** The issue's description */
  body: string;
  /** Comments on the issue */
  comments: GitHubComment[];
  /** Labels attached to the issue */
  labels: GitHubLabel[];
  /** The issue's title */
  title: string;
  /** The URL of the issue or pull request */
  url: string;
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
 * Represents a GitHub PR review comment from GraphQL API
 */
export interface GitHubGraphQLReviewComment {
  /** The comment's author */
  author: UserLogin;
  /** The comment's content */
  body: string;
  /** The file path this comment is on */
  path?: string;
  /** The line number this comment is on */
  line?: number;
  /** The diff hunk showing the code context */
  diffHunk?: string;
  /** When the comment was created */
  createdAt: string;
}

/**
 * Represents a GitHub PR review thread from GraphQL API
 */
export interface GitHubGraphQLReviewThread {
  /** Whether the conversation is resolved */
  isResolved: boolean;
  /** Comments in this thread */
  comments: {
    nodes: GitHubGraphQLReviewComment[];
  };
}

/**
 * Represents a GitHub PR review (overall review with state)
 */
export interface GitHubReview {
  /** The review's unique ID */
  id: number;
  /** The review's author */
  user: UserLogin;
  /** The review's content/body */
  body: string;
  /** The review state (APPROVED, COMMENTED, CHANGES_REQUESTED, etc.) */
  state: string;
  /** When the review was submitted */
  submitted_at: string;
  /** The commit SHA this review was submitted for */
  commit_id: string;
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
 * Alternative repository info interface for compatibility
 */
export interface RepositoryData {
  /** The repository owner's username */
  owner: string;
  /** The repository name */
  name: string;
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
