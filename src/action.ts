import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import core from '@actions/core';
import { loadConfigFile } from './config.js';
import { DEFAULT_CODING_TOOL, DEFAULT_MAX_TEST_ATTEMPTS } from './defaultOptions.js';
import { main } from './main.js';
import type { CodingTool, ReasoningEffort } from './types.js';

const configOptions = loadConfigFile();

// Get inputs (GitHub Action inputs override config file values)
const issueNumber = core.getInput('issue-number', { required: true });
const planningModel =
  core.getInput('planning-model', { required: false }) || (configOptions['planning-model'] as string);
const twoStagePlanningInput =
  core.getInput('two-staged-planning', { required: false }) || (configOptions['two-staged-planning'] as string);
const twoStagePlanning = twoStagePlanningInput !== 'false';
const reasoningEffort = (core.getInput('reasoning-effort', { required: false }) ||
  (configOptions['reasoning-effort'] as string)) as ReasoningEffort | undefined;
const dryRunInput = core.getInput('dry-run', { required: false }) || (configOptions['dry-run'] as string);
const dryRun = dryRunInput === 'true';
const codingTool = (core.getInput('coding-tool', { required: false }) ||
  (configOptions['coding-tool'] as string) ||
  DEFAULT_CODING_TOOL) as CodingTool;
const aiderExtraArgs =
  core.getInput('aider-extra-args', { required: false }) || (configOptions['aider-extra-args'] as string);
const claudeCodeExtraArgs =
  core.getInput('claude-code-extra-args', { required: false }) || (configOptions['claude-code-extra-args'] as string);
const codexExtraArgs =
  core.getInput('codex-extra-args', { required: false }) || (configOptions['codex-extra-args'] as string);
const geminiExtraArgs =
  core.getInput('gemini-extra-args', { required: false }) || (configOptions['gemini-extra-args'] as string);
const repomixExtraArgs =
  core.getInput('repomix-extra-args', { required: false }) || (configOptions['repomix-extra-args'] as string);
const testCommand = core.getInput('test-command', { required: false }) || (configOptions['test-command'] as string);
const maxTestAttemptsInput =
  core.getInput('max-test-attempts', { required: false }) || (configOptions['max-test-attempts'] as string | number);
const maxTestAttempts = maxTestAttemptsInput
  ? Number.parseInt(String(maxTestAttemptsInput), 10)
  : DEFAULT_MAX_TEST_ATTEMPTS;
const removePattern =
  core.getInput('remove-pattern', { required: false }) || (configOptions['remove-pattern'] as string);
const noBranchInput = core.getInput('no-branch', { required: false }) || (configOptions['no-branch'] as string);
const noBranch = noBranchInput === 'true';

if (reasoningEffort && !['low', 'medium', 'high'].includes(reasoningEffort)) {
  console.error(
    `Invalid reasoning-effort value: ${reasoningEffort}. Using default. Valid values are: low, medium, high`
  );
  process.exit(1);
}

if (!['aider', 'claude-code', 'codex-cli', 'gemini-cli'].includes(codingTool)) {
  console.error(
    `Invalid coding-tool value: ${codingTool}. Using default. Valid values are: aider, claude-code, codex-cli, gemini-cli`
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
  noBranch,
  issueNumber: Number(issueNumber),
  maxTestAttempts,
  planningModel,
  reasoningEffort,
  repomixExtraArgs,
  testCommand,
  removePattern,
});
