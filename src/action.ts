import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import core from '@actions/core';
import YAML from 'yaml';
import {
  DEFAULT_CODING_TOOL,
  DEFAULT_MAX_TEST_ATTEMPTS,
  DEFAULT_REPOMIX_EXTRA_ARGS,
  DEFAULT_AIDER_EXTRA_ARGS,
  DEFAULT_CLAUDE_CODE_EXTRA_ARGS,
  DEFAULT_CODEX_EXTRA_ARGS,
} from './defaultOptions.js';
import { main } from './main.js';
import type { CodingTool, ReasoningEffort } from './types.js';

// Load config file (YAML) from repository root to set default option values
let configOptions: Record<string, unknown> = {};
for (const name of ['gen-pr.config.yml', 'gen-pr.config.yaml']) {
  const cfgPath = path.resolve(process.cwd(), name);
  if (fs.existsSync(cfgPath)) {
    try {
      configOptions = YAML.parse(fs.readFileSync(cfgPath, 'utf8')) as Record<string, unknown>;
      console.info(`Loaded gen-pr config from ${name}`);
    } catch (err) {
      console.error(`Failed to parse config file ${name}:`, err);
      process.exit(1);
    }
    break;
  }
}

// Map of default values defined in action.yml; used to detect defaults vs user inputs
const ACTION_DEFAULTS: Record<string, string> = {
  'two-staged-planning': 'true',
  'coding-tool': DEFAULT_CODING_TOOL,
  'repomix-extra-args': DEFAULT_REPOMIX_EXTRA_ARGS,
  'aider-extra-args': DEFAULT_AIDER_EXTRA_ARGS,
  'claude-code-extra-args': DEFAULT_CLAUDE_CODE_EXTRA_ARGS,
  'codex-extra-args': DEFAULT_CODEX_EXTRA_ARGS,
  'max-test-attempts': DEFAULT_MAX_TEST_ATTEMPTS.toString(),
  'dry-run': 'false',
};

// Helper: workflow inputs override config; config overrides action.yml defaults
function getInputOrConfig(key: string): string {
  const raw = core.getInput(key, { required: false });
  const def = ACTION_DEFAULTS[key];
  if (configOptions.hasOwnProperty(key) && (raw === '' || raw === def)) {
    return String(configOptions[key]);
  }
  return raw;
}

// Get inputs
const issueNumber = core.getInput('issue-number', { required: true });
const planningModel = getInputOrConfig('planning-model') || undefined;
const twoStagePlanning = getInputOrConfig('two-staged-planning') !== 'false';
const reasoningEffort = (getInputOrConfig('reasoning-effort') as ReasoningEffort) || undefined;
const dryRun = getInputOrConfig('dry-run') === 'true';
const codingTool = (getInputOrConfig('coding-tool') || DEFAULT_CODING_TOOL) as CodingTool;
const aiderExtraArgs = getInputOrConfig('aider-extra-args');
const claudeCodeExtraArgs = getInputOrConfig('claude-code-extra-args');
const codexExtraArgs = getInputOrConfig('codex-extra-args');
const repomixExtraArgs = getInputOrConfig('repomix-extra-args');
const testCommand = getInputOrConfig('test-command') || undefined;
const maxTestAttemptsRaw = getInputOrConfig('max-test-attempts');
const maxTestAttempts = maxTestAttemptsRaw
  ? Number.parseInt(maxTestAttemptsRaw, 10)
  : DEFAULT_MAX_TEST_ATTEMPTS;

if (reasoningEffort && !['low', 'medium', 'high'].includes(reasoningEffort)) {
  console.error(
    `Invalid reasoning-effort value: ${reasoningEffort}. Using default. Valid values are: low, medium, high`
  );
  process.exit(1);
}

if (!['aider', 'claude-code', 'codex', 'gemini'].includes(codingTool)) {
  console.error(
    `Invalid coding-tool value: ${codingTool}. Using default. Valid values are: aider, claude-code, codex, gemini`
  );
  process.exit(1);
}

// cf. https://github.com/cli/cli/issues/8441#issuecomment-1870271857
fs.rmSync(path.join(os.homedir(), '.config', 'gh'), { force: true, recursive: true });

void main({
  aiderExtraArgs,
  claudeCodeExtraArgs,
  codexExtraArgs,
  codingTool,
  twoStagePlanning,
  dryRun,
  issueNumber: Number(issueNumber),
  maxTestAttempts,
  planningModel,
  reasoningEffort,
  repomixExtraArgs,
  testCommand,
});
