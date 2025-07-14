import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import type { CodingTool, ReasoningEffort } from './types.js';

/**
 * Configuration options that can be set in the config file
 */
export interface ConfigFileOptions {
  /** LLM for planning code changes */
  'planning-model'?: string;
  /** Enable two-staged planning */
  'two-staged-planning'?: boolean;
  /** Constrains effort on reasoning for planning models */
  'reasoning-effort'?: ReasoningEffort;
  /** Coding tool to use for making changes */
  'coding-tool'?: CodingTool;
  /** Additional arguments to pass to the aider command */
  'aider-extra-args'?: string;
  /** Additional arguments to pass to the claude-code command */
  'claude-code-extra-args'?: string;
  /** Additional arguments to pass to the codex command */
  'codex-extra-args'?: string;
  /** Additional arguments to pass to the gemini command */
  'gemini-extra-args'?: string;
  /** Additional arguments for repomix when generating context */
  'repomix-extra-args'?: string;
  /** Command to run after the coding tool applies changes */
  'test-command'?: string;
  /** Maximum number of attempts to fix test failures */
  'max-test-attempts'?: number;
  /** Run without making actual changes */
  'dry-run'?: boolean;
}

/**
 * Load configuration from .gen-prrc.json or .gen-prrc.yaml file in the current directory
 * @returns The loaded configuration or an empty object if no config file is found
 */
export function loadConfigFile(): ConfigFileOptions {
  const cwd = process.cwd();

  // Try .gen-prrc.json first
  const jsonConfigPath = resolve(cwd, '.gen-prrc.json');
  if (existsSync(jsonConfigPath)) {
    try {
      const content = readFileSync(jsonConfigPath, 'utf-8');
      const config = JSON.parse(content) as ConfigFileOptions;
      console.info(`Loaded configuration from ${jsonConfigPath}`);
      return config;
    } catch (error) {
      console.error(`Error loading ${jsonConfigPath}:`, error);
    }
  }

  // Try .gen-prrc.yaml or .gen-prrc.yml
  for (const filename of ['.gen-prrc.yaml', '.gen-prrc.yml']) {
    const yamlConfigPath = resolve(cwd, filename);
    if (existsSync(yamlConfigPath)) {
      try {
        const content = readFileSync(yamlConfigPath, 'utf-8');
        const config = YAML.parse(content) as ConfigFileOptions;
        console.info(`Loaded configuration from ${yamlConfigPath}`);
        return config;
      } catch (error) {
        console.error(`Error loading ${yamlConfigPath}:`, error);
      }
    }
  }

  return {};
}
