import { DEFAULT_CODEX_EXTRA_ARGS } from '../defaultOptions.js';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';
import { parseCommandLineArgs } from '../utils.js';

/**
 * Builds the command line arguments for the npx codex command
 *
 * @param options The main options object
 * @param args Arguments to include
 * @returns An array of command line arguments for npx codex
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
