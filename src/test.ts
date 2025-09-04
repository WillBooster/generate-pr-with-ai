import ansis from 'ansis';
import type { MainOptions } from './main.js';
import { findDistinctFence } from './markdown.js';
import type { ResolutionPlan } from './plan.js';
import { parseCommandLineArgs, runCommand, spawnAsync } from './spawn.js';
import { buildAiderArgs } from './tools/aider.js';
import { buildClaudeCodeArgs } from './tools/claudeCode.js';
import { buildCodexArgs } from './tools/codex.js';
import { buildGeminiArgs } from './tools/gemini.js';

export interface TestResult {
  fixResult: string;
  success: boolean;
  error?: string;
}

export async function testAndFix(options: MainOptions, resolutionPlan?: ResolutionPlan): Promise<TestResult> {
  const [commandProgram, ...commandArgs] = parseCommandLineArgs(options.testCommand || '');
  if (!commandProgram) return { fixResult: '', success: true };

  const maxAttempts = options.maxTestAttempts;
  let attempts = 0;
  let fixResult = '';
  let success = false;
  let lastError = '';

  while (attempts < maxAttempts) {
    attempts++;
    console.info(ansis.cyan(`Executing test command (attempt ${attempts}/${maxAttempts}): ${options.testCommand}`));

    const testResult = await spawnAsync(commandProgram, commandArgs, {
      cwd: process.cwd(),
    });

    if (testResult.status === 0) {
      console.info(ansis.green('Test command passed successfully.'));
      success = true;
      break;
    }

    console.warn(ansis.yellow(`Test command failed with exit code ${testResult.status}.`));

    // Capture the error details
    lastError = `Test command failed with exit code ${testResult.status}\n\nStdout:\n${testResult.stdout}\n\nStderr:\n${testResult.stderr}`;

    // Only try to fix if we haven't reached the maximum attempts
    if (attempts >= maxAttempts) {
      console.warn(ansis.yellow(`Maximum fix attempts (${maxAttempts}) reached. Giving up.`));
      break;
    }

    const stdoutFence = findDistinctFence(testResult.stdout, '~');
    const stderrFence = findDistinctFence(testResult.stderr, '~');
    const prompt = `
The previous changes were applied, but the test command \`${options.testCommand}\` failed.

Exit code: ${testResult.status}

Stdout:
${stdoutFence}
${testResult.stdout}
${stdoutFence}

Stderr:
${stderrFence}
${testResult.stderr}
${stderrFence}

Please analyze the output and fix the errors.
`.trim();

    fixResult += await runToolFix(options, prompt, resolutionPlan);
  }

  return { fixResult, success, error: success ? undefined : lastError };
}

/**
 * Helper function to run coding tool with a fix prompt
 */
export async function runToolFix(
  options: MainOptions,
  prompt: string,
  resolutionPlan?: ResolutionPlan
): Promise<string> {
  const toolName =
    options.codingTool === 'aider'
      ? 'Aider'
      : options.codingTool === 'claude-code'
        ? 'Claude Code'
        : options.codingTool === 'codex-cli'
          ? 'Codex CLI'
          : 'Gemini CLI';
  let assistantResult: string;

  if (options.codingTool === 'aider') {
    const aiderArgs = buildAiderArgs(options, { prompt, resolutionPlan });
    console.info(ansis.cyan(`Asking Aider to fix "${options.testCommand}"...`));
    assistantResult = (
      await runCommand('aider', aiderArgs, {
        env: { ...process.env, NO_COLOR: '1' },
        ignoreExitStatus: true,
      })
    ).stdout;
  } else if (options.codingTool === 'claude-code') {
    const claudeCodeArgs = buildClaudeCodeArgs(options, { prompt, resolutionPlan });
    console.info(ansis.cyan(`Asking Claude Code to fix "${options.testCommand}"...`));
    assistantResult = (
      await runCommand(options.nodeRuntime, claudeCodeArgs, {
        env: { ...process.env, NO_COLOR: '1' },
        stdio: 'inherit',
        ignoreExitStatus: true,
      })
    ).stdout;
  } else if (options.codingTool === 'codex-cli') {
    const codexArgs = buildCodexArgs(options, { prompt, resolutionPlan });
    console.info(ansis.cyan(`Asking Codex to fix "${options.testCommand}"...`));
    assistantResult = (
      await runCommand(options.nodeRuntime, codexArgs, {
        env: { ...process.env, NO_COLOR: '1' },
        ignoreExitStatus: true,
      })
    ).stdout;
  } else {
    const geminiArgs = buildGeminiArgs(options, { prompt, resolutionPlan });
    console.info(ansis.cyan(`Asking Gemini CLI to fix "${options.testCommand}"...`));
    assistantResult = (
      await runCommand(options.nodeRuntime, geminiArgs, {
        env: { ...process.env, NO_COLOR: '1' },
        ignoreExitStatus: true,
      })
    ).stdout;
  }

  return `\n\n## ${toolName} fix attempt for "${options.testCommand}"\n\n${assistantResult.trim()}`;
}
