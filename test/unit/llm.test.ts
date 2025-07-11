import { describe, expect, test } from 'bun:test';
import { supportsReasoning } from '../../src/llm.js';

describe('model reasoning support detection', () => {
  describe('supportsReasoning function', () => {
    test('should correctly identify OpenAI o1/o3/o4 models as supporting reasoning', () => {
      expect(supportsReasoning('openai', 'o1-preview')).toBe(true);
      expect(supportsReasoning('openai', 'o1-mini')).toBe(true);
      expect(supportsReasoning('openai', 'o1')).toBe(true);
      expect(supportsReasoning('openai', 'o3-mini')).toBe(true);
      expect(supportsReasoning('openai', 'o3')).toBe(true);
      expect(supportsReasoning('openai', 'o4-mini')).toBe(true);
      expect(supportsReasoning('openai', 'o4')).toBe(true);
    });

    test('should correctly identify OpenAI GPT models as NOT supporting reasoning', () => {
      expect(supportsReasoning('openai', 'gpt-4o')).toBe(false);
      expect(supportsReasoning('openai', 'gpt-4o-mini')).toBe(false);
      expect(supportsReasoning('openai', 'gpt-3.5-turbo')).toBe(false);
      expect(supportsReasoning('openai', 'gpt-4')).toBe(false);
    });

    test('should correctly identify Anthropic Claude 3.7/4 models as supporting reasoning', () => {
      expect(supportsReasoning('anthropic', 'claude-opus-4-20250514')).toBe(true);
      expect(supportsReasoning('anthropic', 'claude-sonnet-4-20250514')).toBe(true);
      expect(supportsReasoning('anthropic', 'claude-3-7-sonnet-20250219')).toBe(true);
      expect(supportsReasoning('anthropic', 'claude-3-7-sonnet-latest')).toBe(true);
    });

    test('should correctly identify older Anthropic Claude models as NOT supporting reasoning', () => {
      expect(supportsReasoning('anthropic', 'claude-3-5-haiku-20241022')).toBe(false);
      expect(supportsReasoning('anthropic', 'claude-3-5-haiku-latest')).toBe(false);
      expect(supportsReasoning('anthropic', 'claude-3-5-sonnet-20241022')).toBe(false);
      expect(supportsReasoning('anthropic', 'claude-3-haiku-20240307')).toBe(false);
      expect(supportsReasoning('anthropic', 'claude-2.1')).toBe(false);
    });

    test('should correctly identify Google Gemini 2.5 models as supporting reasoning', () => {
      expect(supportsReasoning('gemini', 'gemini-2.5-pro')).toBe(true);
      expect(supportsReasoning('gemini', 'gemini-2.5-flash-preview')).toBe(true);
      expect(supportsReasoning('gemini', 'gemini-2.5-flash-preview-04-17')).toBe(true);
    });

    test('should correctly identify older Google Gemini models as NOT supporting reasoning', () => {
      expect(supportsReasoning('gemini', 'gemini-1.5-pro')).toBe(false);
      expect(supportsReasoning('gemini', 'gemini-1.5-flash')).toBe(false);
      expect(supportsReasoning('gemini', 'gemini-pro')).toBe(false);
    });

    test('should correctly identify Bedrock Anthropic Claude models as supporting reasoning', () => {
      expect(supportsReasoning('bedrock', 'anthropic.claude-opus-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoning('bedrock', 'us.anthropic.claude-opus-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoning('bedrock', 'anthropic.claude-sonnet-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoning('bedrock', 'us.anthropic.claude-sonnet-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoning('bedrock', 'anthropic.claude-3-7-sonnet-20250219-v1:0')).toBe(true);
      expect(supportsReasoning('bedrock', 'us.anthropic.claude-3-7-sonnet-20250219-v1:0')).toBe(true);
    });

    test('should correctly identify non-Claude Bedrock models as NOT supporting reasoning', () => {
      expect(supportsReasoning('bedrock', 'anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe(false);
      expect(supportsReasoning('bedrock', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe(false);
      expect(supportsReasoning('bedrock', 'us.anthropic.claude-3-5-haiku-20241022-v1:0')).toBe(false);
      expect(supportsReasoning('bedrock', 'amazon.titan-text-express-v1')).toBe(false);
      expect(supportsReasoning('bedrock', 'meta.llama2-13b-chat-v1')).toBe(false);
    });

    test('should correctly identify Vertex Gemini 2.5 models as supporting reasoning', () => {
      expect(supportsReasoning('vertex', 'gemini-2.5-pro')).toBe(true);
      expect(supportsReasoning('vertex', 'gemini-2.5-flash')).toBe(true);
    });

    test('should correctly identify Vertex Claude models as supporting reasoning', () => {
      expect(supportsReasoning('vertex', 'claude-opus-4@20250514')).toBe(true);
      expect(supportsReasoning('vertex', 'claude-sonnet-4@20250514')).toBe(true);
      expect(supportsReasoning('vertex', 'claude-3-7-sonnet@20250219')).toBe(true);
    });

    test('should correctly identify older Vertex models as NOT supporting reasoning', () => {
      expect(supportsReasoning('vertex', 'gemini-1.5-pro')).toBe(false);
      expect(supportsReasoning('vertex', 'gemini-1.5-flash')).toBe(false);
      expect(supportsReasoning('vertex', 'claude-3-5-haiku@20241022')).toBe(false);
    });

    test('should correctly identify Azure o1/o3/o4 models as supporting reasoning', () => {
      expect(supportsReasoning('azure', 'o1-preview')).toBe(true);
      expect(supportsReasoning('azure', 'o3-mini')).toBe(true);
      expect(supportsReasoning('azure', 'o4-mini')).toBe(true);
    });

    test('should correctly identify Azure GPT models as NOT supporting reasoning', () => {
      expect(supportsReasoning('azure', 'gpt-4o')).toBe(false);
      expect(supportsReasoning('azure', 'gpt-35-turbo')).toBe(false);
    });

    test('should correctly identify Grok models as supporting reasoning', () => {
      expect(supportsReasoning('grok', 'grok-3')).toBe(true);
      expect(supportsReasoning('grok', 'grok-beta')).toBe(true);
      expect(supportsReasoning('grok', 'grok-vision-beta')).toBe(true);
      expect(supportsReasoning('grok', 'grok-2-1212')).toBe(true);
      expect(supportsReasoning('grok', 'grok-3-fast')).toBe(true);
      expect(supportsReasoning('grok', 'grok-3-mini')).toBe(true);
    });

    test('should return false for unsupported providers', () => {
      expect(supportsReasoning('unsupported', 'any-model')).toBe(false);
      expect(supportsReasoning('unknown', 'test-model')).toBe(false);
    });
  });
});
