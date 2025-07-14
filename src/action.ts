import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import core from '@actions/core';
import { loadConfigFile } from './config.js';
import { DEFAULT_CODING_TOOL, DEFAULT_MAX_TEST_ATTEMPTS } from './defaultOptions.js';
import { main } from './main.js';
import type { CodingTool, ReasoningEffort } from './types.js';

// Load config file
const configFile = loadConfigFile();

// Get inputs
const issueNumber = core.getInput('issue-number', { required: true });
const planningModel = core.getInput('planning-model', { required: false }) || configFile['planning-model'];
const twoStagePlanning = core.getInput('two-staged-planning', { required: false })
  ? core.getInput('two-staged-planning', { required: false }) !== 'false'
  : (configFile['two-staged-planning'] ?? true);
const reasoningEffort = (core.getInput('reasoning-effort', { required: false }) || configFile['reasoning-effort']) as
  | ReasoningEffort
  | undefined;
const dryRun = core.getInput('dry-run', { required: false })
  ? core.getInput('dry-run', { required: false }) === 'true'
  : (configFile['dry-run'] ?? false);
const codingTool = (core.getInput('coding-tool', { required: false }) ||
  configFile['coding-tool'] ||
  DEFAULT_CODING_TOOL) as CodingTool;
const aiderExtraArgs = core.getInput('aider-extra-args', { required: false }) || configFile['aider-extra-args'];
const claudeCodeExtraArgs =
  core.getInput('claude-code-extra-args', { required: false }) || configFile['claude-code-extra-args'];
const codexExtraArgs = core.getInput('codex-extra-args', { required: false }) || configFile['codex-extra-args'];
const geminiExtraArgs = core.getInput('gemini-extra-args', { required: false }) || configFile['gemini-extra-args'];
const repomixExtraArgs = core.getInput('repomix-extra-args', { required: false }) || configFile['repomix-extra-args'];
const testCommand = core.getInput('test-command', { required: false }) || configFile['test-command'];
const maxTestAttemptsInput = core.getInput('max-test-attempts', { required: false });
const maxTestAttempts = maxTestAttemptsInput
  ? Number.parseInt(maxTestAttemptsInput, 10)
  : (configFile['max-test-attempts'] ?? DEFAULT_MAX_TEST_ATTEMPTS);

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
  geminiExtraArgs,
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
