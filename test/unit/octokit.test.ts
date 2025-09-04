import { describe, expect, test } from 'bun:test';
import type { PullRequestParams } from '../../src/types.js';

describe('PullRequestParams interface', () => {
  test('should have correct structure for regular PR', () => {
    const params: PullRequestParams = {
      title: 'Fix: Regular PR',
      body: 'This is a regular PR body',
      head: 'feature-branch',
      base: 'main',
      draft: false,
    };

    expect(typeof params.title).toBe('string');
    expect(typeof params.body).toBe('string');
    expect(typeof params.head).toBe('string');
    expect(typeof params.base).toBe('string');
    expect(typeof params.draft).toBe('boolean');
    expect(params.draft).toBe(false);
  });

  test('should have correct structure for draft PR', () => {
    const params: PullRequestParams = {
      title: 'Fix: Draft PR with errors',
      body: 'This PR has errors:\n\n### ❌ Tool Execution Error\n\n```\nTool failed\n```',
      head: 'error-branch',
      base: 'main',
      draft: true,
    };

    expect(typeof params.title).toBe('string');
    expect(typeof params.body).toBe('string');
    expect(typeof params.head).toBe('string');
    expect(typeof params.base).toBe('string');
    expect(typeof params.draft).toBe('boolean');
    expect(params.draft).toBe(true);
    expect(params.body).toContain('### ❌ Tool Execution Error');
  });

  test('should handle optional draft parameter', () => {
    const params: PullRequestParams = {
      title: 'Fix: No draft parameter',
      body: 'Regular PR body',
      head: 'no-draft-branch',
      base: 'main',
      // draft parameter omitted
    };

    expect(typeof params.title).toBe('string');
    expect(typeof params.body).toBe('string');
    expect(typeof params.head).toBe('string');
    expect(typeof params.base).toBe('string');
    expect(params.draft).toBeUndefined();
  });

  test('should handle error logs in PR body', () => {
    const errorLogs =
      '\n\n### ❌ Aider Execution Error\n\n```\nAider failed with exit code 1\nSome error details\n```\n\n### ❌ Test Execution Error\n\n```\nTest command failed\nTest output here\n```';

    const params: PullRequestParams = {
      title: 'Fix: PR with multiple errors',
      body: `Original PR description${errorLogs}`,
      head: 'error-branch',
      base: 'main',
      draft: true,
    };

    expect(params.body).toContain('Original PR description');
    expect(params.body).toContain('### ❌ Aider Execution Error');
    expect(params.body).toContain('### ❌ Test Execution Error');
    expect(params.body).toContain('Aider failed with exit code 1');
    expect(params.body).toContain('Test command failed');
    expect(params.draft).toBe(true);
  });

  test('should handle different tool error types', () => {
    const toolTypes = ['Aider', 'Claude Code', 'Codex CLI', 'Gemini CLI'];

    toolTypes.forEach((tool) => {
      const errorLog = `\n\n### ❌ ${tool} Execution Error\n\n\`\`\`\n${tool} failed with exit code 1\nError details\n\`\`\``;

      const params: PullRequestParams = {
        title: `Fix: ${tool} error`,
        body: `PR body${errorLog}`,
        head: 'tool-error-branch',
        base: 'main',
        draft: true,
      };

      expect(params.body).toContain(`### ❌ ${tool} Execution Error`);
      expect(params.body).toContain(`${tool} failed with exit code 1`);
      expect(params.draft).toBe(true);
    });
  });

  test('should handle empty body', () => {
    const params: PullRequestParams = {
      title: 'Fix: Empty body',
      body: '',
      head: 'empty-branch',
      base: 'main',
      draft: false,
    };

    expect(params.body).toBe('');
    expect(params.draft).toBe(false);
  });

  test('should handle complex PR body structure', () => {
    const complexBody = `
# Pull Request Description

This PR attempts to fix the reported issue.

## Changes Made
- Updated function A
- Modified component B
- Fixed test cases

## Error Information

### ❌ Tool Execution Error

\`\`\`
Tool failed with exit code 1
Error: Could not parse the file
Stack trace here...
\`\`\`

### ❌ Test Execution Error

\`\`\`
Test command failed with exit code 2

Stdout:
Running tests...
3 passing
2 failing

Stderr:
Error: Assertion failed
Expected: true
Actual: false
\`\`\`

## Notes
- This is a draft PR due to the errors above
- Manual review required
`;

    const params: PullRequestParams = {
      title: 'Fix: Complex PR with errors',
      body: complexBody,
      head: 'complex-error-branch',
      base: 'main',
      draft: true,
    };

    expect(params.body).toContain('# Pull Request Description');
    expect(params.body).toContain('## Changes Made');
    expect(params.body).toContain('## Error Information');
    expect(params.body).toContain('### ❌ Tool Execution Error');
    expect(params.body).toContain('### ❌ Test Execution Error');
    expect(params.body).toContain('## Notes');
    expect(params.draft).toBe(true);
  });
});
