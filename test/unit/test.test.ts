import { describe, expect, test } from 'bun:test';
import type { MainOptions } from '../../src/main.js';
import type { TestResult } from '../../src/test.js';

describe('TestResult interface', () => {
  test('should have correct structure for success case', () => {
    const result: TestResult = {
      fixResult: 'All fixes applied successfully',
      success: true,
    };

    expect(typeof result.fixResult).toBe('string');
    expect(typeof result.success).toBe('boolean');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should have correct structure for failure case', () => {
    const result: TestResult = {
      fixResult: 'Attempted fixes but tests still fail',
      success: false,
      error: 'Test command failed with exit code 1\n\nStdout:\nTest output\n\nStderr:\nError output',
    };

    expect(typeof result.fixResult).toBe('string');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.error).toBe('string');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Test command failed');
  });

  test('should handle empty fixResult', () => {
    const result: TestResult = {
      fixResult: '',
      success: true,
    };

    expect(result.fixResult).toBe('');
    expect(result.success).toBe(true);
  });

  test('should handle detailed error information', () => {
    const errorDetails = `Test command failed with exit code 1

Stdout:
Running tests...
✓ passing test 1
✓ passing test 2
✗ failing test 3
✗ failing test 4

Stderr:
AssertionError: expected true to equal false
  at /path/to/test.js:42:5
  at TestContext.run (/path/to/framework.js:123:8)`;

    const result: TestResult = {
      fixResult: 'Applied 2 fixes but issues remain',
      success: false,
      error: errorDetails,
    };

    expect(result.error).toContain('Test command failed with exit code 1');
    expect(result.error).toContain('Running tests...');
    expect(result.error).toContain('AssertionError');
    expect(result.fixResult).toContain('Applied 2 fixes');
    expect(result.success).toBe(false);
  });
});

describe('MainOptions for testing functionality', () => {
  test('should support all coding tools', () => {
    const codingTools = ['aider', 'claude-code', 'codex-cli', 'gemini-cli'] as const;

    codingTools.forEach((tool) => {
      const options: MainOptions = {
        codingTool: tool,
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        nodeRuntime: 'npx',
        issueNumber: 123,
        maxTestAttempts: 3,
        testCommand: 'npm test',
      };

      expect(['aider', 'claude-code', 'codex-cli', 'gemini-cli']).toContain(options.codingTool);
      expect(options.maxTestAttempts).toBe(3);
      expect(options.testCommand).toBe('npm test');
    });
  });

  test('should handle different maxTestAttempts values', () => {
    const attemptValues = [1, 2, 3, 5, 10];

    attemptValues.forEach((attempts) => {
      const options: Partial<MainOptions> = {
        maxTestAttempts: attempts,
        codingTool: 'aider',
      };

      expect(options.maxTestAttempts).toBe(attempts);
      expect(options.maxTestAttempts).toBeGreaterThan(0);
    });
  });

  test('should handle various test commands', () => {
    const testCommands = ['npm test', 'bun test', 'yarn test', 'pnpm test', 'pytest', 'go test', 'cargo test'];

    testCommands.forEach((command) => {
      const options: Partial<MainOptions> = {
        testCommand: command,
        codingTool: 'aider',
      };

      expect(typeof options.testCommand).toBe('string');
      expect(options.testCommand).toBe(command);
    });
  });

  test('should handle empty or undefined test command', () => {
    const options1: Partial<MainOptions> = {
      testCommand: '',
      codingTool: 'aider',
    };

    const options2: Partial<MainOptions> = {
      testCommand: undefined,
      codingTool: 'aider',
    };

    expect(options1.testCommand).toBe('');
    expect(options2.testCommand).toBeUndefined();
  });
});

describe('Error handling patterns', () => {
  test('should format exit code errors correctly', () => {
    const formatError = (tool: string, exitCode: number, stderr: string) => {
      return `${tool} failed with exit code ${exitCode}\n${stderr}`;
    };

    const error = formatError('Aider', 1, 'Some error output');
    expect(error).toBe('Aider failed with exit code 1\nSome error output');

    const error2 = formatError('Claude Code', 2, 'Different error');
    expect(error2).toBe('Claude Code failed with exit code 2\nDifferent error');
  });

  test('should create detailed test error messages', () => {
    const createTestError = (exitCode: number, stdout: string, stderr: string) => {
      return `Test command failed with exit code ${exitCode}\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}`;
    };

    const error = createTestError(1, 'Test output', 'Error details');
    expect(error).toContain('Test command failed with exit code 1');
    expect(error).toContain('Stdout:\nTest output');
    expect(error).toContain('Stderr:\nError details');
  });

  test('should determine success based on exit code', () => {
    const isSuccess = (exitCode: number) => exitCode === 0;

    expect(isSuccess(0)).toBe(true);
    expect(isSuccess(1)).toBe(false);
    expect(isSuccess(2)).toBe(false);
    expect(isSuccess(-1)).toBe(false);
  });
});

describe('Tool execution patterns', () => {
  test('should handle ignoreExitStatus flag', () => {
    const processResult = (exitCode: number, ignoreExitStatus: boolean) => {
      if (ignoreExitStatus) {
        return { shouldContinue: true, success: exitCode === 0 };
      }
      return { shouldContinue: exitCode === 0, success: exitCode === 0 };
    };

    // With ignoreExitStatus: true, should continue even on failure
    const result1 = processResult(1, true);
    expect(result1.shouldContinue).toBe(true);
    expect(result1.success).toBe(false);

    // With ignoreExitStatus: false, should not continue on failure
    const result2 = processResult(1, false);
    expect(result2.shouldContinue).toBe(false);
    expect(result2.success).toBe(false);

    // Success case should work the same either way
    const result3 = processResult(0, true);
    expect(result3.shouldContinue).toBe(true);
    expect(result3.success).toBe(true);

    const result4 = processResult(0, false);
    expect(result4.shouldContinue).toBe(true);
    expect(result4.success).toBe(true);
  });
});
