import ansis from 'ansis';
import { buildAiderArgs } from './aider.js';
import type { MainOptions } from './main.js';
import type { ResolutionPlan } from './plan.js';
import { runCommand, spawnAsync } from './spawn.js';
import { parseCommandLineArgs } from './utils.js';

export async function testAndFix(options: MainOptions, resolutionPlan?: ResolutionPlan): Promise<string> {
  const maxAttempts = options.maxTestAttempts;
  let attempts = 0;
  let fixResult = '';

  while (attempts < maxAttempts) {
    attempts++;
    console.info(ansis.cyan(`Executing test command (attempt ${attempts}/${maxAttempts}): ${options.testCommand}`));
    const [commandProgram, ...commandArgs] = parseCommandLineArgs(options.testCommand || '');

    const testResult = await spawnAsync(commandProgram, commandArgs, {
      cwd: process.cwd(),
    });

    if (testResult.status === 0) {
      console.info(ansis.green('Test command passed successfully.'));
      break;
    }

    console.warn(ansis.yellow(`Test command failed with exit code ${testResult.status}.`));

    // Only try to fix if we haven't reached the maximum attempts
    if (attempts >= maxAttempts) {
      console.warn(ansis.yellow(`Maximum fix attempts (${maxAttempts}) reached. Giving up.`));
      break;
    }

    const prompt = `
The previous changes were applied, but the test command \`${options.testCommand}\` failed.

Exit code: ${testResult.status}

Stdout:
\`\`\`
${testResult.stdout}
\`\`\`

Stderr:
\`\`\`
${testResult.stderr}
\`\`\`

Please analyze the output and fix the errors.
`.trim();

    fixResult += await runAiderFix(options, prompt, resolutionPlan);
  }

  return fixResult;
}

/**
 * Helper function to run Aider with a fix prompt
 */
export async function runAiderFix(
  options: MainOptions,
  prompt: string,
  resolutionPlan?: ResolutionPlan
): Promise<string> {
  const aiderArgs = buildAiderArgs(options, { prompt, resolutionPlan });

  console.info(ansis.cyan(`Asking Aider to fix "${options.testCommand}"...`));
  const aiderResult = await runCommand('aider', aiderArgs, {
    env: { ...process.env, NO_COLOR: '1' },
  });

  return `\n\n# Aider fix attempt for "${options.testCommand}"\n\n${aiderResult.trim()}`;
}
