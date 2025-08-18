import { graphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';
import { runCommand } from './spawn.js';
import type {
  LabelInfo,
  PullRequestParams,
  PullRequestReview,
  PullRequestReviewThreadsResponse,
  RepositoryData,
  RepositoryInfo,
  SimpleComment,
} from './types.js';

let octokitInstance: Octokit | null = null;
let graphqlInstance: typeof graphql | null = null;
let repoOwner: string | null = null;
let repoName: string | null = null;

async function getGitHubToken(): Promise<string> {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    return token;
  }

  // Fallback to gh auth token if environment variables are not set
  try {
    const { stdout } = await runCommand('gh', ['auth', 'token'], { ignoreExitStatus: true });
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch {
    // Ignore error
  }

  throw new Error(
    'GitHub token not found. Please set GH_TOKEN or GITHUB_TOKEN environment variable, or authenticate with gh CLI'
  );
}

async function getOctokit(): Promise<Octokit> {
  if (!octokitInstance) {
    const token = await getGitHubToken();
    octokitInstance = new Octokit({
      auth: token,
    });
  }
  return octokitInstance;
}

async function getGraphqlClient(): Promise<typeof graphql> {
  if (!graphqlInstance) {
    const token = await getGitHubToken();
    graphqlInstance = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
  }
  return graphqlInstance;
}

async function getRepoInfo(): Promise<RepositoryInfo> {
  if (!repoOwner || !repoName) {
    // Get repo info from git remote
    const { stdout } = await runCommand('git', ['remote', 'get-url', 'origin'], { ignoreExitStatus: true });
    const remoteUrl = stdout.trim();

    // Parse GitHub repo URL (supports both https and ssh formats)
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
    if (match) {
      repoOwner = match[1];
      repoName = match[2].replace(/\.git$/, '');
    } else {
      throw new Error('Could not parse GitHub repository from remote URL');
    }
  }

  if (!repoOwner || !repoName) {
    throw new Error('Repository information not properly initialized');
  }
  return { owner: repoOwner, repo: repoName };
}

export async function createPullRequest(params: PullRequestParams): Promise<void> {
  const octokit = await getOctokit();
  const { owner, repo } = await getRepoInfo();

  await octokit.pulls.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base,
  });
}

export async function getPullRequestDiff(pullNumber: number): Promise<string> {
  const octokit = await getOctokit();
  const { owner, repo } = await getRepoInfo();

  const response = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: 'diff',
    },
  });

  return response.data as unknown as string;
}

export async function getIssue(issueNumber: number): Promise<{
  author: string;
  title: string;
  body: string;
  labels: LabelInfo[];
  comments: SimpleComment[];
  url: string;
}> {
  const octokit = await getOctokit();
  const { owner, repo } = await getRepoInfo();

  try {
    // Try to get it as a pull request first
    const prResponse = await octokit.pulls.get({
      owner,
      repo,
      pull_number: issueNumber,
    });

    const commentsResponse = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return {
      author: prResponse.data.user?.login || '',
      title: prResponse.data.title,
      body: prResponse.data.body || '',
      labels: prResponse.data.labels.map((label) => ({
        name: typeof label === 'string' ? label : label.name || '',
      })),
      comments: commentsResponse.data.map((comment) => ({
        author: comment.user?.login || '',
        body: comment.body || '',
        createdAt: comment.created_at,
      })),
      url: prResponse.data.html_url,
    };
  } catch {
    // If it's not a PR, get it as an issue
    const issueResponse = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const commentsResponse = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return {
      author: issueResponse.data.user?.login || '',
      title: issueResponse.data.title,
      body: issueResponse.data.body || '',
      labels: issueResponse.data.labels.map((label) => ({
        name: typeof label === 'string' ? label : label.name || '',
      })),
      comments: commentsResponse.data.map((comment) => ({
        author: comment.user?.login || '',
        body: comment.body || '',
        createdAt: comment.created_at,
      })),
      url: issueResponse.data.html_url,
    };
  }
}

export async function getRepository(): Promise<RepositoryData> {
  const { owner, repo } = await getRepoInfo();
  return { owner, name: repo };
}

export async function getPullRequestReviewThreads(pullNumber: number): Promise<PullRequestReviewThreadsResponse> {
  const graphqlClient = await getGraphqlClient();
  const { owner, repo } = await getRepoInfo();

  const MAX_MESSAGE_COUNT = 100;
  const query = `
    query($owner: String!, $repo: String!, $pr: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pr) {
          reviewThreads(first: ${MAX_MESSAGE_COUNT}) {
            nodes {
              isResolved
              comments(first: ${MAX_MESSAGE_COUNT}) {
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

  const result = await graphqlClient(query, {
    owner,
    repo,
    pr: pullNumber,
  });

  return result as PullRequestReviewThreadsResponse;
}

export async function getPullRequestReviews(pullNumber: number): Promise<PullRequestReview[]> {
  const octokit = await getOctokit();
  const { owner, repo } = await getRepoInfo();

  const response = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return response.data.map((review) => ({
    user: { login: review.user?.login || '' },
    state: review.state,
    body: review.body || '',
    submitted_at: review.submitted_at || '',
  }));
}
