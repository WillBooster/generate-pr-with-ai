import fs from 'node:fs';
import path from 'node:path';
import type { CodingTool, ReasoningEffort } from './types.js';

const CONFIG_FILE_NAME = '.pr-buddy.json';

export interface Config {
  'planning-model'?: string;
  'two-staged-planning'?: boolean;
  'reasoning-effort'?: ReasoningEffort;
  'coding-tool'?: CodingTool;
  'aider-extra-args'?: string;
  'claude-code-extra-args'?: string;
  'codex-extra-args'?: string;
  'gemini-extra-args'?: string;
  'repomix-extra-args'?: string;
  'test-command'?: string;
  'max-test-attempts'?: number;
  'dry-run'?: boolean;
}

export function loadConfig(): Config {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent) as Config;
    } catch (error) {
      console.warn(`Error reading or parsing config file at ${configPath}:`, error);
    }
  }
  return {};
}
