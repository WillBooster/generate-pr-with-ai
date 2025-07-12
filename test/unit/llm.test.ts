import { describe, expect, test } from 'bun:test';
import { supportsReasoningOptions } from '../../src/llm.js';

describe('model reasoning support detection', () => {
  describe('supportsReasoning function', () => {
    test('should correctly identify OpenAI o1/o3/o4 models as supporting reasoning', () => {
      expect(supportsReasoningOptions('openai', 'o1-preview')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o1-mini')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o1')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o3-mini')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o3')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o4-mini')).toBe(true);
      expect(supportsReasoningOptions('openai', 'o4')).toBe(true);
    });

    test('should correctly identify OpenAI GPT models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('openai', 'gpt-4o')).toBe(false);
      expect(supportsReasoningOptions('openai', 'gpt-4o-mini')).toBe(false);
      expect(supportsReasoningOptions('openai', 'gpt-3.5-turbo')).toBe(false);
      expect(supportsReasoningOptions('openai', 'gpt-4')).toBe(false);
    });

    test('should correctly identify Anthropic Claude 3.7/4 models as supporting reasoning', () => {
      expect(supportsReasoningOptions('anthropic', 'claude-opus-4-20250514')).toBe(true);
      expect(supportsReasoningOptions('anthropic', 'claude-sonnet-4-20250514')).toBe(true);
      expect(supportsReasoningOptions('anthropic', 'claude-3-7-sonnet-20250219')).toBe(true);
      expect(supportsReasoningOptions('anthropic', 'claude-3-7-sonnet-latest')).toBe(true);
    });

    test('should correctly identify older Anthropic Claude models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('anthropic', 'claude-3-5-haiku-20241022')).toBe(false);
      expect(supportsReasoningOptions('anthropic', 'claude-3-5-haiku-latest')).toBe(false);
      expect(supportsReasoningOptions('anthropic', 'claude-3-5-sonnet-20241022')).toBe(false);
      expect(supportsReasoningOptions('anthropic', 'claude-3-haiku-20240307')).toBe(false);
      expect(supportsReasoningOptions('anthropic', 'claude-2.1')).toBe(false);
    });

    test('should correctly identify Google Gemini 2.5 models as supporting reasoning', () => {
      expect(supportsReasoningOptions('gemini', 'gemini-2.5-pro')).toBe(true);
      expect(supportsReasoningOptions('gemini', 'gemini-2.5-flash-preview')).toBe(true);
      expect(supportsReasoningOptions('gemini', 'gemini-2.5-flash-preview-04-17')).toBe(true);
    });

    test('should correctly identify older Google Gemini models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('gemini', 'gemini-1.5-pro')).toBe(false);
      expect(supportsReasoningOptions('gemini', 'gemini-1.5-flash')).toBe(false);
      expect(supportsReasoningOptions('gemini', 'gemini-pro')).toBe(false);
    });

    test('should correctly identify Bedrock Anthropic Claude models as supporting reasoning', () => {
      expect(supportsReasoningOptions('bedrock', 'anthropic.claude-opus-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoningOptions('bedrock', 'us.anthropic.claude-opus-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoningOptions('bedrock', 'anthropic.claude-sonnet-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoningOptions('bedrock', 'us.anthropic.claude-sonnet-4-20250514-v1:0')).toBe(true);
      expect(supportsReasoningOptions('bedrock', 'anthropic.claude-3-7-sonnet-20250219-v1:0')).toBe(true);
      expect(supportsReasoningOptions('bedrock', 'us.anthropic.claude-3-7-sonnet-20250219-v1:0')).toBe(true);
    });

    test('should correctly identify non-Claude Bedrock models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('bedrock', 'anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe(false);
      expect(supportsReasoningOptions('bedrock', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe(false);
      expect(supportsReasoningOptions('bedrock', 'us.anthropic.claude-3-5-haiku-20241022-v1:0')).toBe(false);
      expect(supportsReasoningOptions('bedrock', 'amazon.titan-text-express-v1')).toBe(false);
      expect(supportsReasoningOptions('bedrock', 'meta.llama2-13b-chat-v1')).toBe(false);
    });

    test('should correctly identify Vertex Gemini 2.5 models as supporting reasoning', () => {
      expect(supportsReasoningOptions('vertex', 'gemini-2.5-pro')).toBe(true);
      expect(supportsReasoningOptions('vertex', 'gemini-2.5-flash')).toBe(true);
    });

    test('should correctly identify Vertex Claude models as supporting reasoning', () => {
      expect(supportsReasoningOptions('vertex', 'claude-opus-4@20250514')).toBe(true);
      expect(supportsReasoningOptions('vertex', 'claude-sonnet-4@20250514')).toBe(true);
      expect(supportsReasoningOptions('vertex', 'claude-3-7-sonnet@20250219')).toBe(true);
    });

    test('should correctly identify older Vertex models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('vertex', 'gemini-1.5-pro')).toBe(false);
      expect(supportsReasoningOptions('vertex', 'gemini-1.5-flash')).toBe(false);
      expect(supportsReasoningOptions('vertex', 'claude-3-5-haiku@20241022')).toBe(false);
    });

    test('should correctly identify Azure o1/o3/o4 models as supporting reasoning', () => {
      expect(supportsReasoningOptions('azure', 'o1-preview')).toBe(true);
      expect(supportsReasoningOptions('azure', 'o3-mini')).toBe(true);
      expect(supportsReasoningOptions('azure', 'o4-mini')).toBe(true);
    });

    test('should correctly identify Azure GPT models as NOT supporting reasoning', () => {
      expect(supportsReasoningOptions('azure', 'gpt-4o')).toBe(false);
      expect(supportsReasoningOptions('azure', 'gpt-35-turbo')).toBe(false);
    });

    test('should correctly identify Grok models as supporting reasoning', () => {
      expect(supportsReasoningOptions('xai', 'grok-3')).toBe(true);
      expect(supportsReasoningOptions('xai', 'grok-beta')).toBe(false);
      expect(supportsReasoningOptions('xai', 'grok-vision-beta')).toBe(false);
      expect(supportsReasoningOptions('xai', 'grok-2-1212')).toBe(false);
      expect(supportsReasoningOptions('xai', 'grok-3-fast')).toBe(true);
      expect(supportsReasoningOptions('xai', 'grok-3-mini')).toBe(true);
    });

    test('should return false for unsupported providers', () => {
      expect(supportsReasoningOptions('unsupported', 'any-model')).toBe(false);
      expect(supportsReasoningOptions('unknown', 'test-model')).toBe(false);
    });
  });
});
