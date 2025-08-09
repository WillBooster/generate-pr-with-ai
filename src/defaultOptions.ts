import type { NodeRuntimeActual } from './types.js';

/** "--yes-always --no-check-update --no-gitignore --no-show-model-warnings --no-show-release-notes" is always applied */
export const DEFAULT_AIDER_EXTRA_ARGS = '--model gemini/gemini-2.5-pro --edit-format diff-fenced';
/** "--dangerously-skip-permissions --print" is always applied */
export const DEFAULT_CLAUDE_CODE_EXTRA_ARGS = '--allowedTools Bash Edit Write';
/** exec is always applied */
export const DEFAULT_CODEX_EXTRA_ARGS = '--full-auto';
/** "--yolo" is always applied */
export const DEFAULT_GEMINI_EXTRA_ARGS = '';
export const DEFAULT_REPOMIX_EXTRA_ARGS = '--compress --remove-empty-lines --include "src/**/*.{ts,tsx},**/*.md"';
export const DEFAULT_MAX_TEST_ATTEMPTS = 5;
export const DEFAULT_CODING_TOOL = 'aider';
export const DEFAULT_NODE_RUNTIME: NodeRuntimeActual = 'npx';
