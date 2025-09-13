import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import core from '@actions/core';
import { loadConfigFile } from './config.js';
import { DEFAULT_CODING_TOOL, DEFAULT_MAX_TEST_ATTEMPTS, DEFAULT_NODE_RUNTIME } from './defaultOptions.js';
import { main } from './main.js';
import type { CodingTool, NodeRuntime, ReasoningEffort } from './types.js';
import { validateMainOptions } from './utils/validation.js';

const configOptions = loadConfigFile();

// Get inputs (GitHub Action inputs override config file values)
const issueNumber = core.getInput('issue-number', { required: true });
const planningModel =
  core.getInput('planning-model', { required: false }) || (configOptions['planning-model'] as string);
const twoStagePlanningInput =
  core.getInput('two-staged-planning', { required: false }) || String(configOptions['two-staged-planning'] ?? '');
const twoStagePlanning = twoStagePlanningInput !== 'false';
const reasoningEffort = (core.getInput('reasoning-effort', { required: false }) ||
  (configOptions['reasoning-effort'] as string)) as ReasoningEffort | undefined;
const dryRunInput = core.getInput('dry-run', { required: false }) || String(configOptions['dry-run'] ?? '');
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
const noBranchInput = core.getInput('no-branch', { required: false }) || String(configOptions['no-branch'] ?? '');
const noBranch = noBranchInput === 'true';
const verboseInput = core.getInput('verbose', { required: false }) || String(configOptions.verbose ?? '');
const verbose = verboseInput === 'true';
const nodeRuntime = (core.getInput('node-runtime', { required: false }) ||
  (configOptions['node-runtime'] as string) ||
  DEFAULT_NODE_RUNTIME) as NodeRuntime;

// Validate all options using shared utility
validateMainOptions({
  reasoningEffort,
  codingTool,
  nodeRuntime,
});

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
  nodeRuntime,
  issueNumber: Number(issueNumber),
  maxTestAttempts,
  planningModel,
  reasoningEffort,
  repomixExtraArgs,
  testCommand,
  removePattern,
  verbose,
});
