import { isCI } from '../ci.js';
import { DEFAULT_CLAUDE_CODE_EXTRA_ARGS } from '../defaultOptions.js';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';

import { parseCommandLineArgs } from '../spawn.js';

/**
 * Builds the command line arguments for the Claude Code command
 *
 * @param options The main options object
 * @param args Arguments to include
 * @returns An array of command line arguments for @anthropic-ai/claude-code@latest
 */
export function buildClaudeCodeArgs(
  options: MainOptions,
  args: { prompt: string; resolutionPlan?: ResolutionPlan }
): string[] {
  // cf. https://docs.anthropic.com/en/docs/claude-code/cli-usage
  const baseArgs = [
    '--yes',
    '@anthropic-ai/claude-code@latest',
    ...parseCommandLineArgs(options.claudeCodeExtraArgs || DEFAULT_CLAUDE_CODE_EXTRA_ARGS),
    // Bypass all permission checks
    '--dangerously-skip-permissions',
  ];
  if (isCI) {
    baseArgs.push('--print');
  }
  baseArgs.push(args.prompt);
  return baseArgs;
}
