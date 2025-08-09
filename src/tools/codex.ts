import { DEFAULT_CODEX_EXTRA_ARGS } from '../defaultOptions.js';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';

import { parseCommandLineArgs } from '../spawn.js';

/**
 * Builds the command line arguments for the Codex CLI command
 *
 * @param options The main options object
 * @param args Arguments to include
 * @returns An array of command line arguments for @openai/codex@latest
 */
export function buildCodexArgs(
  options: MainOptions,
  args: { prompt: string; resolutionPlan?: ResolutionPlan }
): string[] {
  return [
    '--yes',
    '@openai/codex@latest',
    'exec',
    ...parseCommandLineArgs(options.codexExtraArgs || DEFAULT_CODEX_EXTRA_ARGS),
    args.prompt,
  ];
}
