import { describe, expect, test } from 'bun:test';
import type { ModelMessage } from 'ai';
import { configureEnvVars } from '../../src/env.js';
import { callLlmApi } from '../../src/llm.js';

configureEnvVars();

describe('callLlmApi', () => {
  const testMessages: ModelMessage[] = [{ role: 'user', content: 'Say only `Hi`' }];

  // Note: These are integration tests that require actual API keys
  // They will be skipped if the required environment variables are not set

  test.skipIf(!process.env.OPENAI_API_KEY)('should call OpenAI API successfully', async () => {
    expect(await callLlmApi('openai/gpt-4.1', testMessages)).toContain('Hi');
  });

  test.skipIf(!process.env.ANTHROPIC_API_KEY)('should call Anthropic API successfully', async () => {
    expect(await callLlmApi('anthropic/claude-4-sonnet-latest', testMessages)).toContain('Hi');
  });

  test.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
    'should call Google Gemini API successfully',
    async () => {
      expect(await callLlmApi('gemini/gemini-2.5-pro', testMessages)).toContain('Hi');
    },
    10000
  );

  test.skipIf(!process.env.AZURE_OPENAI_API_KEY)('should call Azure OpenAI API successfully', async () => {
    expect(await callLlmApi('azure/gpt-4.1', testMessages)).toContain('Hi');
  });

  test.skipIf(!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)(
    'should call AWS Bedrock API successfully',
    async () => {
      expect(await callLlmApi('bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0', testMessages)).toContain('Hi');
    }
  );

  test.skipIf(!process.env.GOOGLE_APPLICATION_CREDENTIALS)(
    'should call Google Vertex AI API successfully',
    async () => {
      expect(await callLlmApi('vertex/gemini-2.5-pro', testMessages)).toContain('Hi');
    }
  );

  test.skipIf(!process.env.XAI_API_KEY)(
    'should call Grok API successfully',
    async () => {
      expect(await callLlmApi('xai/grok-4', testMessages)).toContain('Hi');
    },
    { timeout: 60000 }
  );

  test.skipIf(!process.env.OPENROUTER_API_KEY)(
    'should call OpenRouter API successfully',
    async () => {
      expect(await callLlmApi('openrouter/deepseek/deepseek-chat-v3-0324:free', testMessages)).toContain('Hi');
    },
    { timeout: 30000 }
  );

  test(
    'should call Ollama API successfully',
    async () => {
      expect(await callLlmApi('ollama/gemma3:1b', testMessages)).toContain('Hi');
    },
    { timeout: 30000 }
  );

  describe('reasoning effort with thinking budget', () => {
    test.skipIf(!process.env.OPENAI_API_KEY)('should work with OpenAI reasoning effort low', async () => {
      expect(await callLlmApi('openai/o4-mini', testMessages, 'low')).toContain('Hi');
    });

    test.skipIf(!process.env.ANTHROPIC_API_KEY)('should work with Anthropic reasoning effort', async () => {
      expect(await callLlmApi('anthropic/claude-4-sonnet-20250514', testMessages, 'low')).toContain('Hi');
    });

    test.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)('should work with Google thinking budget', async () => {
      expect(await callLlmApi('gemini/gemini-2.5-flash-preview-04-17', testMessages, 'low')).toContain('Hi');
    });

    test.skipIf(!process.env.AZURE_OPENAI_API_KEY)('should work with Azure OpenAI reasoning effort', async () => {
      expect(await callLlmApi('azure/o4-mini', testMessages, 'low')).toContain('Hi');
    });

    test.skipIf(!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)(
      'should call AWS Bedrock API successfully',
      async () => {
        expect(await callLlmApi('bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0', testMessages, 'low')).toContain(
          'Hi'
        );
      }
    );

    test.skipIf(!process.env.XAI_API_KEY)('should work with Grok reasoning effort', async () => {
      expect(await callLlmApi('xai/grok-3-mini', testMessages, 'low')).toContain('Hi');
    });

    test.skipIf(!process.env.OPENROUTER_API_KEY)(
      'should work with OpenRouter reasoning effort',
      async () => {
        expect(await callLlmApi('openrouter/deepseek/deepseek-r1-0528:free', testMessages, 'low')).toContain('Hi');
      },
      { timeout: 60000 }
    );
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      // THis test verifies that API errors are caught and logged
      const originalConsoleError = console.error;
      const originalProcessExit = process.exit;

      let errorLogged = false;
      let exitCalled = false;

      console.error = () => {
        errorLogged = true;
      };

      process.exit = () => {
        exitCalled = true;
        throw new Error('process.exit called');
      };

      try {
        // THis should fail because 'invalid' is not a supported provider
        await callLlmApi('invalid/model', testMessages);
        expect.unreachable('Should have thrown an error');
      } catch {
        expect(errorLogged).toBe(true);
        expect(exitCalled).toBe(true);
      } finally {
        console.error = originalConsoleError;
        process.exit = originalProcessExit;
      }
    });
  });
});
