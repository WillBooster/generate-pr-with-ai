import { DEFAULT_AIDER_EXTRA_ARGS } from '../defaultOptions.js';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';
import { parseCommandLineArgs } from '../utils.js';

/**
 * Builds the command line arguments for the aider command
 *
 * @param options The main options object
 * @param args Arguments to include
 * @returns An array of command line arguments for aider
 */
export function buildAiderArgs(
  options: MainOptions,
  args: { prompt: string; resolutionPlan?: ResolutionPlan }
): string[] {
  const aiderArgs = [
    '--yes-always',
    '--no-check-update',
    '--no-gitignore',
    '--no-show-model-warnings',
    '--no-show-release-notes',
    ...parseCommandLineArgs(options.aiderExtraArgs || DEFAULT_AIDER_EXTRA_ARGS),
    '--message',
    args.prompt,
  ];

  if (options.dryRun) {
    aiderArgs.push('--dry-run');
  }
  if (args.resolutionPlan && 'filePaths' in args.resolutionPlan) {
    aiderArgs.push(...args.resolutionPlan.filePaths);
  }

  return aiderArgs;
}
