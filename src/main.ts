import type { SpawnOptions } from 'node:child_process';
import ansis from 'ansis';
import YAML from 'yaml';
import { configureEnvVars } from './env.js';
import { configureGitUserDetailsIfNeeded, getBaseBranch, getCurrentBranch, getHeaderOfFirstCommit } from './git.js';
import { createIssueInfo } from './issue.js';
import { findDistinctFence } from './markdown.js';
import { createPullRequest } from './octokit.js';
import { planCodeChanges } from './plan.js';
import { normalizeNodeRuntime, runCommand } from './spawn.js';
import { testAndFix } from './test.js';
import { HEADING_OF_GEN_PR_METADATA, truncateText } from './text.js';
import type { CodingTool, NodeRuntime, NodeRuntimeActual, ReasoningEffort } from './types.js';
import { logVerboseOptions } from './utils/logging.js';
import { createStandardRunOptions, getToolCommandAndArgs, getToolName } from './utils/toolRegistry.js';
import { yamlStringifyOptions } from './yaml.js';

/**
 * Options for the main function
 */
export interface MainOptions {
  /** Additional arguments to pass to Aider */
  aiderExtraArgs?: string;
  /** Additional arguments to pass to Claude Code */
  claudeCodeExtraArgs?: string;
  /** Additional arguments to pass to Codex CLI */
  codexExtraArgs?: string;
  /** Additional arguments to pass to Gemini CLI */
  geminiExtraArgs?: string;
  /** Coding tool to use */
  codingTool: CodingTool;
  /** Enable two-staged planning: first select relevant files, then generate detailed implementation plans */
  twoStagePlanning: boolean;
  /** Run without making actual changes (no branch creation, no PR) */
  dryRun: boolean;
  /** Do not create a new branch, commit changes directly to the base branch */
  noBranch: boolean;
  /** Node.js runtime to use */
  nodeRuntime: NodeRuntime;
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
  /** RegExp pattern to remove from issue and PR descriptions */
  removePattern?: string;
  /** Print parsed options at start */
  verbose?: boolean;
}

const MAX_PR_BODY_LENGTH = 30000; // GitHub's limit is 65536, leave some buffer

export async function main(options: MainOptions): Promise<void> {
  configureEnvVars();

  // Print parsed options if verbose flag is set
  logVerboseOptions(options, options.verbose);

  // Normalize the runtime value (convert aliases to actual commands)
  const nodeRuntime: NodeRuntimeActual = normalizeNodeRuntime(options.nodeRuntime);

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

  const prBaseBranch = await getBaseBranch(options);
  const isPullRequest = !!prBaseBranch;
  const baseBranch = prBaseBranch || (await getCurrentBranch());

  const issueInfo = await createIssueInfo(options);
  const issueText = YAML.stringify(issueInfo, yamlStringifyOptions).trim();

  const resolutionPlan =
    (options.planningModel &&
      (await planCodeChanges(
        options.planningModel,
        issueText,
        options.twoStagePlanning,
        options.reasoningEffort,
        options.repomixExtraArgs,
        isPullRequest
      ))) ||
    undefined;
  console.info('Resolution plan:', resolutionPlan);

  const planText = (resolutionPlan && 'plan' in resolutionPlan && resolutionPlan.plan) || '';
  const issueFence = findDistinctFence(issueText, '~');
  const isAgentic = options.codingTool !== 'aider';
  const target = isPullRequest ? 'the comments on the following GitHub pull request' : 'the following GitHub issue';
  const prompt = `
Modify the code to resolve ${target}${planText ? ' based on the plan' : ''}.${isAgentic ? ' After that, commit your changes with a message, following the Conventional Commits specification.' : ''}

## ${isPullRequest ? 'Pull Request' : 'Issue'}

${issueFence}yml
${issueText}
${issueFence}

${
  planText &&
  `## Plan

${planText}`
}
`.trim();

  const now = new Date();
  const newBranchName = `gen-pr-${options.issueNumber}-${options.codingTool}-${now.getFullYear()}_${getTwoDigits(now.getMonth() + 1)}${getTwoDigits(now.getDate())}_${getTwoDigits(now.getHours())}${getTwoDigits(now.getMinutes())}${getTwoDigits(now.getSeconds())}`;

  if (options.noBranch) {
    if (options.dryRun) {
      console.info(ansis.yellow(`Would commit directly to base branch: ${baseBranch}`));
    } else {
      if (isPullRequest) {
        await runCommand('git', ['fetch', 'origin', baseBranch]);
      }
      await runCommand('git', ['switch', baseBranch]);
    }
  } else {
    if (options.dryRun) {
      console.info(ansis.yellow(`Would create branch: ${newBranchName}`));
    } else {
      if (isPullRequest) {
        await runCommand('git', ['fetch', 'origin', baseBranch]);
        await runCommand('git', ['switch', baseBranch]);
      }
      await runCommand('git', ['switch', '--force-create', newBranchName]);
    }
  }

  // Execute coding tool
  let toolResult = '';
  let toolCommand: string;
  let toolError = '';
  let toolSuccess = true;
  const toolName = getToolName(options.codingTool);

  // Build tool configuration using registry
  const {
    command,
    args: toolArgs,
    runOptions,
  } = getToolCommandAndArgs(options.codingTool, options, nodeRuntime, {
    prompt,
    resolutionPlan,
  });

  const runOpts: SpawnOptions & { ignoreExitStatus?: boolean } = {
    ...createStandardRunOptions(),
    ...runOptions,
  };

  toolCommand = buildToolCommandString(command, toolArgs, prompt);

  // Execute tool command
  if (options.dryRun) {
    console.info(`\n=== DRY MODE: ${toolName} Prompt ===`);
    console.info(prompt);
    console.info(`=== End ${toolName} Prompt ===\n`);
    console.info(ansis.yellow(`Would run: ${toolCommand}`));
    toolResult = 'Skipped due to dry-run mode';
  } else {
    const toolRunResult = await runCommand(command, toolArgs, runOpts);
    toolResult = toolRunResult.stdout || '';
    if (toolRunResult.status !== 0) {
      toolSuccess = false;
      toolError = `${toolName} failed with exit code ${toolRunResult.status}\n${toolRunResult.stderr}`;
      console.error(ansis.red(`${toolName} execution failed: ${toolError}`));
    }
  }

  let toolResponse = (toolResult || '').trim();
  let testSuccess = true;
  let testError = '';
  if (options.dryRun) {
    console.info(ansis.yellow(`Would run test command`));
  } else {
    const testResult = await testAndFix(options, resolutionPlan);
    toolResponse += testResult.fixResult;
    testSuccess = testResult.success;
    testError = testResult.error || '';
    if (!testSuccess) {
      console.warn(ansis.yellow('Tests failed after all fix attempts. Will create a draft PR.'));
    }
  }

  if (!toolSuccess) {
    console.warn(ansis.yellow(`${toolName} execution failed. Will create a draft PR.`));
  }

  // Determine if PR should be a draft
  const shouldBeDraft = !toolSuccess || !testSuccess;
  let errorLogs = '';
  if (shouldBeDraft) {
    if (toolError) {
      errorLogs += `\n\n### ❌ ${toolName} Execution Error\n\n\`\`\`\n${toolError}\n\`\`\``;
    }
    if (testError) {
      errorLogs += `\n\n### ❌ Test Execution Error\n\n\`\`\`\n${testError}\n\`\`\``;
    }
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
  if (options.noBranch) {
    if (options.dryRun) {
      console.info(ansis.yellow(`Would push changes directly to base branch: ${baseBranch}`));
    } else {
      await runCommand('git', ['push', 'origin', baseBranch, '--no-verify']);
    }
  } else {
    if (options.dryRun) {
      console.info(ansis.yellow(`Would push branch: ${newBranchName} to origin`));
    } else {
      await runCommand('git', ['push', 'origin', newBranchName, '--no-verify']);
    }
  }

  // Create a PR using GitHub CLI (unless noBranch is enabled)
  if (options.noBranch) {
    if (options.dryRun) {
      console.info(ansis.yellow(`Skipping PR creation due to --no-branch option`));
    } else {
      console.info(`Changes committed directly to base branch: ${baseBranch}`);
    }
  } else {
    const prTitle = getHeaderOfFirstCommit(baseBranch) || commitMessage;
    let prBody = isPullRequest ? '' : `Close #${options.issueNumber}`;

    if (options.planningModel) {
      prBody += `

${HEADING_OF_GEN_PR_METADATA}

- **Planning Model:** ${options.planningModel}`;
    }

    prBody += `
- **Coding Tool:** ${toolName}
- **Coding Command:** \`${toolCommand}\``;
    if (planText) {
      const responseFence = findDistinctFence(planText, '~');
      prBody += `

### Plan

${responseFence}
${truncateText(planText, (toolResponse.length / (planText.length + toolResponse.length)) * MAX_PR_BODY_LENGTH)}
${responseFence}`;
    }
    if (toolResponse) {
      const responseFence = findDistinctFence(toolResponse, '~');
      prBody += `

### ${toolName} Log

${responseFence}
${truncateText(toolResponse, (toolResponse.length / (planText.length + toolResponse.length)) * MAX_PR_BODY_LENGTH)}
${responseFence}`;
    }
    prBody = prBody.replaceAll(/(?:\s*\n){2,}/g, '\n\n').trim();

    // Add error logs to PR body if it's a draft due to failures
    if (shouldBeDraft) {
      prBody += errorLogs;
    }

    if (options.dryRun) {
      console.info(ansis.yellow(`Would create PR with title: ${prTitle}${shouldBeDraft ? ' (as draft)' : ''}`));
    } else {
      await createPullRequest({
        title: prTitle,
        body: prBody,
        head: newBranchName,
        base: baseBranch,
        draft: shouldBeDraft,
      });
    }
  }

  console.info(`\n${isPullRequest ? 'Pull request' : 'Issue'} #${options.issueNumber} processed successfully.`);
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
