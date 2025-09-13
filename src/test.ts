import ansis from 'ansis';
import type { MainOptions } from './main.js';
import { findDistinctFence } from './markdown.js';
import type { ResolutionPlan } from './plan.js';
import { normalizeNodeRuntime, parseCommandLineArgs, runCommand, spawnAsync } from './spawn.js';
import { createStandardRunOptions, getToolCommandAndArgs, getToolName } from './utils/toolRegistry.js';

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
  const toolName = getToolName(options.codingTool);

  // Normalize the runtime value (convert aliases to actual commands)
  const nodeRuntime = normalizeNodeRuntime(options.nodeRuntime);

  // Build tool configuration using registry
  const {
    command,
    args: toolArgs,
    runOptions,
  } = getToolCommandAndArgs(options.codingTool, options, nodeRuntime, {
    prompt,
    resolutionPlan,
  });

  const runOpts = {
    ...createStandardRunOptions(),
    ...runOptions,
  };

  console.info(ansis.cyan(`Asking ${toolName} to fix "${options.testCommand}"...`));
  const assistantResult = (await runCommand(command, toolArgs, runOpts)).stdout;

  return `\n\n## ${toolName} fix attempt for "${options.testCommand}"\n\n${assistantResult.trim()}`;
}
