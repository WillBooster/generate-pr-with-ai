/**
 * Utility functions for logging
 */

/**
 * Log options in verbose mode
 */
export function logVerboseOptions(options: unknown, verbose?: boolean): void {
  if (verbose) {
    console.info('Parsed options:');
    console.info(JSON.stringify(options, null, 2));
  }
}
