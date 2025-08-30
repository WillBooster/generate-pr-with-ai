import child_process from 'node:child_process';
import { graphql } from '@octokit/graphql';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { Octokit } from '@octokit/rest';
import { runCommand } from './spawn.js';
import type {
  LabelInfo,
  PullRequestParams,
  PullRequestReview,
  PullRequestReviewThreadsResponse,
  RepositoryInfo,
  SimpleComment,
} from './types.js';

const token =
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN ||
  child_process.spawnSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).stdout.trim();
if (!token) {
  throw new Error(
    'GitHub token not found. Please set GH_TOKEN or GITHUB_TOKEN environment variable, or authenticate with gh CLI'
  );
}
const octokit = new Octokit({
  auth: token,
});
const graphqlClient = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
});

let repoOwner: string | undefined;
let repoName: string | undefined;
async function getRepoInfo(): Promise<RepositoryInfo> {
  if (!repoOwner || !repoName) {
    // Get repo info from git remote
    const { stdout } = await runCommand('git', ['remote', 'get-url', 'origin'], { ignoreExitStatus: true });
    const remoteUrl = stdout.trim();

    // Parse GitHub repo URL (supports both https and ssh formats)
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+)/);
    if (match?.[1] && match[2]) {
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
  const { owner, repo } = await getRepoInfo();

  // Get issue data first - this works for both issues and PRs
  const { data: issueData } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  // If it has pull_request field, get the full PR data
  let issueOrPullRequest:
    | RestEndpointMethodTypes['pulls']['get']['response']['data']
    | RestEndpointMethodTypes['issues']['get']['response']['data'] = issueData;
  if (issueData.pull_request) {
    const { data: prData } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: issueNumber,
    });
    issueOrPullRequest = prData;
  }

  const commentsResponse = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    author: issueOrPullRequest.user?.login || '',
    title: issueOrPullRequest.title,
    body: issueOrPullRequest.body || '',
    labels: issueOrPullRequest.labels.map((label: string | { name?: string }) => ({
      name: typeof label === 'string' ? label : label.name || '',
    })),
    comments: commentsResponse.data.map((comment) => ({
      author: comment.user?.login || '',
      body: comment.body || '',
      createdAt: comment.created_at,
    })),
    url: issueOrPullRequest.html_url,
  };
}

export async function getPullRequestReviewThreads(pullNumber: number): Promise<PullRequestReviewThreadsResponse> {
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
