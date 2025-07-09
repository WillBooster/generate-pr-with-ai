import child_process from 'node:child_process';
import ansis from 'ansis';
import YAML from 'yaml';
import { configureEnvVars } from './env.js';
import { createIssueInfo } from './issue.js';
import { findDistinctFence } from './markdown.js';
import { planCodeChanges } from './plan.js';
import { configureGitUserDetailsIfNeeded } from './profile.js';
import { runCommand } from './spawn.js';
import { testAndFix } from './test.js';
import { truncateText } from './text.js';
import { buildAiderArgs } from './tools/aider.js';
import { buildClaudeCodeArgs } from './tools/claudeCode.js';
import { buildCodexArgs } from './tools/codex.js';
import { buildGeminiArgs } from './tools/gemini.js';
import type { CodingTool, ReasoningEffort } from './types.js';
import { yamlStringifyOptions } from './yaml.js';

/**
 * Options for the main function
 */
export interface MainOptions {
  /** Additional arguments to pass to the aider command */
  aiderExtraArgs?: string;
  /** Additional arguments to pass to the claude-code command */
  claudeCodeExtraArgs?: string;
  /** Additional arguments to pass to the codex command */
  codexExtraArgs?: string;
  /** Additional arguments to pass to the gemini command */
  geminiExtraArgs?: string;
  /** Coding tool to use */
  codingTool: CodingTool;
  /** Enable two-staged planning: first select relevant files, then generate detailed implementation plans */
  twoStagePlanning: boolean;
  /** Run without making actual changes (no branch creation, no PR) */
  dryRun: boolean;
  /** GitHub issue number to process */
  issueNumber: number;
  /** Maximum number of attempts to fix test failures */
  maxTestAttempts: number;
  /** LLM model to use for planning code changes */
  planningModel?: string;
  /** Level of reasoning effort for the LLM */
  reasoningEffort?: ReasoningEffort;
  /** Extra arguments for repomix when generating context */
  repomixExtraArgs?: string;
  /** Command to run after coding tool applies changes. If it fails, the assistant will try to fix it. */
  testCommand?: string;
}

const MAX_PR_BODY_LENGTH = 30000; // GitHub's limit is 65536, leave some buffer

export async function main(options: MainOptions): Promise<void> {
  configureEnvVars();

  if (options.dryRun) {
    console.info(ansis.yellow('Running in dry-run mode. No branches or PRs will be created.'));
  } else {
    await configureGitUserDetailsIfNeeded();
  }

  // Install coding tools
  if (options.codingTool === 'aider') {
    await runCommand('python', ['-m', 'pip', 'install', 'aider-install']);
    await reshimToDetectNewTools();
    await runCommand('uv', ['tool', 'uninstall', 'aider-chat'], { ignoreExitStatus: true });
    await runCommand('aider-install', []);
    await reshimToDetectNewTools();

    if (options.aiderExtraArgs?.includes('bedrock/')) {
      await runCommand('uv', [
        'tool',
        'run',
        '--from',
        'aider-chat',
        'pip',
        'install',
        '--upgrade',
        '--upgrade-strategy',
        'only-if-needed',
        'boto3',
      ]);
      // await runCommand('aider', ['--install-main-branch', '--yes-always']);
    }
  }

  const issueInfo = await createIssueInfo(options);
  const issueText = YAML.stringify(issueInfo, yamlStringifyOptions).trim();

  const resolutionPlan =
    (options.planningModel &&
      (await planCodeChanges(
        options.planningModel,
        issueText,
        options.twoStagePlanning,
        options.reasoningEffort,
        options.repomixExtraArgs
      ))) ||
    undefined;
  console.log('Resolution plan:', resolutionPlan);

  const planText =
    resolutionPlan && 'plan' in resolutionPlan && resolutionPlan.plan
      ? `
# Plan

${resolutionPlan.plan}
`.trim()
      : '';
  const issueFence = findDistinctFence(issueText);
  const isAgentic = options.codingTool !== 'aider';
  const prompt = `
Modify the code to resolve the following GitHub issue${planText ? ' based on the plan' : ''}.${isAgentic ? ' After that, commit your changes with a message, following the Conventional Commits specification.' : ''}

# Issue

${issueFence}yml
${issueText}
${issueFence}

${planText}
`.trim();

  const now = new Date();

  const branchName = `gen-pr-${options.issueNumber}-${options.codingTool}-${now.getFullYear()}_${getTwoDigits(now.getMonth() + 1)}${getTwoDigits(now.getDate())}_${getTwoDigits(now.getHours())}${getTwoDigits(now.getMinutes())}${getTwoDigits(now.getSeconds())}`;
  if (!options.dryRun) {
    await runCommand('git', ['switch', '-C', branchName]);
  } else {
    console.info(ansis.yellow(`Would create branch: ${branchName}`));
  }

  // Execute coding tool
  let assistantResult: string;
  let toolCommand: string;
  if (options.codingTool === 'aider') {
    const aiderArgs = buildAiderArgs(options, { prompt: prompt, resolutionPlan });
    toolCommand = buildToolCommandString('aider', aiderArgs, prompt);
    assistantResult = (
      await runCommand('aider', aiderArgs, {
        env: { ...process.env, NO_COLOR: '1' },
      })
    ).stdout;
  } else if (options.codingTool === 'claude-code') {
    const claudeCodeArgs = buildClaudeCodeArgs(options, { prompt: prompt, resolutionPlan });
    toolCommand = buildToolCommandString('npx', claudeCodeArgs, prompt);
    if (options.dryRun) {
      console.info(ansis.yellow(`Would run: ${toolCommand}`));
      assistantResult = 'Skipped in dry-run mode';
    } else {
      assistantResult = (
        await runCommand('npx', claudeCodeArgs, {
          env: { ...process.env, NO_COLOR: '1' },
          stdio: 'inherit',
        })
      ).stdout;
    }
  } else if (options.codingTool === 'codex') {
    const codexArgs = buildCodexArgs(options, { prompt: prompt, resolutionPlan });
    toolCommand = buildToolCommandString('npx', codexArgs, prompt);
    if (options.dryRun) {
      console.info(ansis.yellow(`Would run: ${toolCommand}`));
      assistantResult = 'Skipped in dry-run mode';
    } else {
      assistantResult = (
        await runCommand('npx', codexArgs, {
          env: { ...process.env, NO_COLOR: '1' },
        })
      ).stdout;
    }
  } else {
    const geminiArgs = buildGeminiArgs(options, { prompt: prompt, resolutionPlan });
    toolCommand = buildToolCommandString('npx', geminiArgs, prompt);
    if (options.dryRun) {
      console.info(ansis.yellow(`Would run: ${toolCommand}`));
      assistantResult = 'Skipped in dry-run mode';
    } else {
      assistantResult = (
        await runCommand('npx', geminiArgs, {
          env: { ...process.env, NO_COLOR: '1' },
        })
      ).stdout;
    }
  }

  let assistantResponse = assistantResult.trim();
  if (options.testCommand) {
    assistantResponse += await testAndFix(options, resolutionPlan);
  }

  // Try commiting changes because coding tool may fail to commit changes due to pre-commit hooks
  const commitMessage = resolutionPlan?.commitMessage || `fix: Close #${options.issueNumber}`;
  await runCommand('git', ['add', '-A'], { ignoreExitStatus: true });
  if (
    (
      await runCommand('git', ['commit', '-m', commitMessage], {
        ignoreExitStatus: true,
      })
    ).status !== 0
  ) {
    await runCommand('git', ['commit', '-m', commitMessage, '--no-verify'], {
      ignoreExitStatus: true,
    });
  }
  if (!options.dryRun) {
    await runCommand('git', ['push', 'origin', branchName, '--no-verify']);
  } else {
    console.info(ansis.yellow(`Would push branch: ${branchName} to origin`));
  }

  // Create a PR using GitHub CLI
  const prTitle = getHeaderOfFirstCommit();
  let prBody = `Close #${options.issueNumber}`;

  if (options.planningModel) {
    prBody += `

- **Planning Model:** ${options.planningModel}`;
  }

  const assistantName =
    options.codingTool === 'aider' ? 'Aider' : options.codingTool === 'claude-code' ? 'Claude Code' : 'Codex';
  prBody += `
- **Coding Tool:** ${assistantName}
- **Coding Command:** \`${toolCommand}\`

${truncateText(planText, (planText.length / (planText.length + assistantResponse.length)) * MAX_PR_BODY_LENGTH)}
`;
  if (assistantResponse) {
    const responseFence = findDistinctFence(assistantResponse);
    prBody += `
# ${assistantName} Log

${responseFence}
${truncateText(assistantResponse, (assistantResponse.length / (planText.length + assistantResponse.length)) * MAX_PR_BODY_LENGTH)}
${responseFence}`;
  }
  prBody = prBody.replaceAll(/(?:\s*\n){2,}/g, '\n\n').trim();

  if (!options.dryRun) {
    const repoName = getGitRepoName();
    await runCommand('gh', ['pr', 'create', '--title', prTitle, '--body', prBody, '--repo', repoName]);
  } else {
    console.info(ansis.yellow(`Would create PR with title: ${prTitle}`));
    console.info(
      ansis.yellow(
        `PR body would include the ${assistantName.toLowerCase()} response and close issue #${options.issueNumber}`
      )
    );
  }

  console.info(`\nIssue #${options.issueNumber} processed successfully.`);
}

async function reshimToDetectNewTools() {
  try {
    // Make uv available on asdf environment
    await runCommand('asdf', ['reshim'], { ignoreExitStatus: true });
  } catch {
    // do nothing
  }
}

function getTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function getGitRepoName(): string {
  const repoUrlResult = child_process.spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const repoUrl = repoUrlResult.stdout.trim();
  const repoMatch = repoUrl.match(/github\.com[/:]([\w-]+\/[\w-]+)(\.git)?$/);
  return repoMatch ? repoMatch[1] : '';
}

function getHeaderOfFirstCommit(): string {
  const firstCommitResult = child_process.spawnSync('git', ['log', 'main..HEAD', '--reverse', '--pretty=%s'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return firstCommitResult.stdout.trim().split('\n')[0];
}

/**
 * Builds a command string for display, replacing the prompt argument with ...
 */
function buildToolCommandString(command: string, args: string[], prompt: string): string {
  const escapedArgs = args.map((arg) => {
    if (arg === prompt) {
      return '...';
    }
    if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  });
  return `${command} ${escapedArgs.join(' ')}`;
}
