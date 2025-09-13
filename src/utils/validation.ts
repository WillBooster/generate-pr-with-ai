/**
 * Validation constants and utilities
 */

export const VALID_REASONING_EFFORTS = ['low', 'medium', 'high'] as const;
export const VALID_CODING_TOOLS = ['aider', 'claude-code', 'codex-cli', 'gemini-cli'] as const;
export const VALID_NODE_RUNTIMES = ['node', 'bun', 'npx', 'bunx'] as const;

/**
 * Validate a choice against allowed values
 */
export function validateChoice<T extends readonly string[]>(
  value: string | undefined,
  choices: T,
  optionName: string
): void {
  if (value && !choices.includes(value as T[number])) {
    console.error(`Invalid ${optionName} value: ${value}. Valid values are: ${choices.join(', ')}`);
    process.exit(1);
  }
}

/**
 * Validate all main options
 */
export function validateMainOptions(options: {
  reasoningEffort?: string;
  codingTool?: string;
  nodeRuntime?: string;
}): void {
  validateChoice(options.reasoningEffort, VALID_REASONING_EFFORTS, 'reasoning-effort');
  validateChoice(options.codingTool, VALID_CODING_TOOLS, 'coding-tool');
  validateChoice(options.nodeRuntime, VALID_NODE_RUNTIMES, 'node-runtime');
}
