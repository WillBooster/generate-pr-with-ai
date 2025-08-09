import { DEFAULT_GEMINI_EXTRA_ARGS } from '../defaultOptions.js';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';

import { parseCommandLineArgs } from '../spawn.js';

/**
 * Builds the command line arguments for the Gemini CLI command
 *
 * @param options The main options object
 * @param args Arguments to include
 * @returns An array of command line arguments for @google/gemini-cli@latest
 */
export function buildGeminiArgs(
  options: MainOptions,
  args: { prompt: string; resolutionPlan?: ResolutionPlan }
): string[] {
  return [
    '--yes',
    '@google/gemini-cli@latest',
    '--yolo',
    ...parseCommandLineArgs(options.geminiExtraArgs || DEFAULT_GEMINI_EXTRA_ARGS),
    '--prompt',
    args.prompt,
  ];
}
