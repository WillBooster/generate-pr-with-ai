import type { SpawnOptions } from 'node:child_process';
import type { MainOptions } from '../main.js';
import type { ResolutionPlan } from '../plan.js';
import { buildAiderArgs } from '../tools/aider.js';
import { buildClaudeCodeArgs } from '../tools/claudeCode.js';
import { buildCodexArgs } from '../tools/codex.js';
import { buildGeminiArgs } from '../tools/gemini.js';
import type { CodingTool } from '../types.js';

export interface ToolArgs {
  prompt: string;
  resolutionPlan?: ResolutionPlan;
}

export interface ToolConfig {
  name: string;
  buildArgs: (options: MainOptions, args: ToolArgs) => string[];
  getCommand: (options: MainOptions) => string;
  getRunOptions?: (options: MainOptions) => SpawnOptions;
}

export const TOOL_REGISTRY: Record<CodingTool, ToolConfig> = {
  aider: {
    name: 'Aider',
    buildArgs: buildAiderArgs,
    getCommand: () => 'aider',
  },
  'claude-code': {
    name: 'Claude Code',
    buildArgs: buildClaudeCodeArgs,
    getCommand: (options) => options.nodeRuntime,
  },
  'codex-cli': {
    name: 'Codex CLI',
    buildArgs: buildCodexArgs,
    getCommand: (options) => options.nodeRuntime,
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    buildArgs: buildGeminiArgs,
    getCommand: (options) => options.nodeRuntime,
  },
};

/**
 * Get the display name for a coding tool
 */
export function getToolName(tool: CodingTool): string {
  return TOOL_REGISTRY[tool].name;
}

/**
 * Get the command and arguments for a coding tool
 */
export function getToolCommandAndArgs(
  tool: CodingTool,
  options: MainOptions,
  args: ToolArgs
): { command: string; args: string[]; runOptions?: SpawnOptions } {
  const config = TOOL_REGISTRY[tool];
  return {
    command: config.getCommand(options),
    args: config.buildArgs(options, args),
    runOptions: config.getRunOptions?.(options),
  };
}

/**
 * Create standard run options for tools
 */
export function createStandardRunOptions(): SpawnOptions & { ignoreExitStatus?: boolean } {
  return {
    env: { ...process.env, NO_COLOR: '1' },
    ignoreExitStatus: true,
  };
}
