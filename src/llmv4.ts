import type { ModelMessage } from 'ai';
import { generateText, type Message } from 'ai-v4';
import { createOllama } from 'ollama-ai-provider-v2';
import { logResult } from './llm.js';
import type { ReasoningEffort } from './types.js';

/**
 * Call AI SDK v4 provider API (for Ollama)
 */
export async function callV4ProviderApi(
  model: string,
  messages: ModelMessage[],
  reasoningEffort?: ReasoningEffort
): Promise<string> {
  try {
    const [provider, ...modelParts] = model.split('/');
    const modelName = modelParts.join('/'); // Handle cases where model name itself contains '/'
    if (!modelName) {
      console.error(`Invalid ${provider} model format: ${model}. Expected format: ${provider}/model-name`);
      process.exit(1);
    }

    const ollamaBaseURL = `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api`;
    const ollama = createOllama({
      baseURL: ollamaBaseURL,
      ...(process.env.OLLAMA_API_KEY && { apiKey: process.env.OLLAMA_API_KEY }),
    });
    const providerModel = ollama(modelName);

    const result = await generateText({
      model: providerModel,
      providerOptions: reasoningEffort ? { ollama: { think: true } } : undefined,
      messages: convertToV4Messages(messages),
    });
    logResult(model, result);
    return result.text;
  } catch (error) {
    const [provider] = model.split('/');
    console.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API error for model ${model}:`, error);
    process.exit(1);
  }
}

/**
 * Convert AI SDK v5 ModelMessage[] to AI SDK v4 Message[] format
 */
function convertToV4Messages(messages: ModelMessage[]): Message[] {
  return messages.map((msg, index) => ({
    id: `msg-${index}`,
    role: msg.role === 'tool' ? 'data' : msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));
}
