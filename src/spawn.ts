import type { SpawnOptions, SpawnSyncReturns } from 'node:child_process';
import { spawn } from 'node:child_process';
import ansis from 'ansis';
import { truncateText } from './text.js';
import type { NodeRuntime, NodeRuntimeActual } from './types.js';

const MAX_LOG_LENGTH = 3000;

/**
 * Normalizes node runtime values to their actual executable commands.
 * 'node' is an alias for 'npx' and 'bun' is an alias for 'bunx'.
 *
 * @param runtime The runtime value to normalize
 * @returns The normalized runtime command
 */
export function normalizeNodeRuntime(runtime: NodeRuntime): NodeRuntimeActual {
  switch (runtime) {
    case 'node':
    case 'npx':
      return 'npx';
    case 'bun':
    case 'bunx':
      return 'bunx';
  }
}

export async function runCommand(
  command: string,
  args: string[],
  options?: SpawnOptions & { ignoreExitStatus?: boolean; truncateStdout?: boolean }
): Promise<Omit<SpawnSyncReturns<string>, 'output' | 'error'>> {
  const { ignoreExitStatus, ...spawnOptions } = options ?? {};
  const argsText = args.map((a) => (a.includes(' ') ? `"${a.replaceAll('"', '"')}"` : a)).join(' ');
  console.info(ansis.green(`$ ${command} ${argsText}`));

  console.info('stdout: ---------------------');
  const ret = await spawnAsync(command, args, spawnOptions);
  if (spawnOptions.truncateStdout) console.info(truncateText(ret.stdout, MAX_LOG_LENGTH));
  const stderr = ret.stderr.trim();
  if (stderr) {
    console.info('stderr: ---------------------');
    const truncatedStderr = truncateText(stderr, MAX_LOG_LENGTH);
    console.info(ansis.yellow(truncatedStderr));
  }
  console.info('-----------------------------');
  console.info(ansis.magenta(`Exit code: ${ret.status}\n`));
  if (!ignoreExitStatus && ret.status !== 0 && ret.status !== null) {
    process.exit(ret.status);
  }
  return ret;
}

export async function spawnAsync(
  command: string,
  args: readonly string[],
  options: SpawnOptions & { truncateStdout?: boolean }
): Promise<Omit<SpawnSyncReturns<string>, 'output' | 'error'>> {
  return new Promise((resolve, reject) => {
    try {
      // Sanitize args to remove null bytes
      const sanitizedArgs = (args ?? []).map((arg) => arg.replace(/\0/g, ''));
      const proc = spawn(command, sanitizedArgs, options);
      // `setEncoding` is undefined in Bun
      proc.stdout?.setEncoding?.('utf8');
      proc.stderr?.setEncoding?.('utf8');

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (data) => {
        if (!options?.truncateStdout) process.stdout.write(data);
        stdout += data;
      });
      proc.stderr?.on('data', (data) => {
        stderr += data;
      });

      proc.on('error', (error) => {
        reject(error);
      });
      proc.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        if (proc.pid === undefined) {
          reject(new Error('Process has no pid.'));
        } else {
          resolve({
            pid: proc.pid,
            stdout,
            stderr,
            status: code,
            signal,
          });
        }
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(error);
    }
  });
}

/**
 * Parses a command line string into an array of arguments, preserving quoted strings.
 *
 * This function handles:
 * - Space-separated arguments
 * - Double-quoted strings (preserves spaces within)
 * - Single-quoted strings (preserves spaces within)
 *
 * @param argsString The command line string to parse
 * @returns An array of parsed arguments
 */
export function parseCommandLineArgs(argsString: string): string[] {
  if (!argsString) return [];

  const result: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];

    // Handle quotes
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    // Handle spaces (only split on spaces outside of quotes)
    if (char === ' ' && !inDoubleQuote && !inSingleQuote) {
      if (current) {
        result.push(current);
        current = '';
      }
      continue;
    }

    // Add character to current argument
    current += char;
  }

  // Add the last argument if there is one
  if (current) {
    result.push(current);
  }

  return result;
}
