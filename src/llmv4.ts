import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { ModelMessage } from 'ai';
import { generateText, type LanguageModelV1, type Message } from 'ai-v4';
import { createOllama } from 'ollama-ai-provider-v2';
import { logResult } from './llm.js';
import type { ReasoningEffort } from './types.js';

/**
 * Call AI SDK v4 provider API (for OpenRouter and Ollama)
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

    let providerModel: LanguageModelV1;
    if (provider === 'openrouter') {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        headers: {
          'HTTP-Referer': 'https://github.com/WillBooster/gen-pr',
          'X-Title': 'gen-pr',
        },
      });
      providerModel = openrouter(
        modelName,
        reasoningEffort
          ? {
              reasoning: {
                effort: reasoningEffort,
              },
            }
          : {}
      );
    } else if (provider === 'ollama') {
      const ollamaBaseURL = `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api`;
      const ollama = createOllama({
        baseURL: ollamaBaseURL,
        ...(process.env.OLLAMA_API_KEY && { apiKey: process.env.OLLAMA_API_KEY }),
      });
      providerModel = ollama.chat(modelName, reasoningEffort ? ({ think: true } as any) : undefined);
    } else {
      throw new Error(`Unsupported v4 provider: ${provider}`);
    }

    const result = await generateText({
      model: providerModel,
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
