import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { type AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI, type GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { createOpenAI, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { createXai } from '@ai-sdk/xai';
import { generateText, type ModelMessage } from 'ai';
import { callV4ProviderApi } from './llmv4.js';
import type { ReasoningEffort } from './types.js';

/**
 * Call LLM API using AI SDK 5
 */
export async function callLlmApi(
  model: string,
  messages: ModelMessage[],
  reasoningEffort?: ReasoningEffort
): Promise<string> {
  try {
    // Special handling for Ollama and OpenRouter using AI SDK v4
    if (model.startsWith('ollama/') || model.startsWith('openrouter/')) {
      return await callV4ProviderApi(model, messages, reasoningEffort);
    }

    const [modelInstance, provider, modelName] = getModelInstance(model);

    // Build the request parameters
    const requestParams: Parameters<typeof generateText>[0] = {
      model: modelInstance,
      messages: messages,
    };

    if (reasoningEffort) {
      // Check if the model supports reasoning/thinking options
      const modelSupportsReasoning = supportsReasoningOptions(provider, modelName);

      if (!modelSupportsReasoning) {
        console.warn(
          `Model ${model} does not support reasoning/thinking options. Ignoring reasoning effort parameter.`
        );
      } else {
        const thinkingBudget = getThinkingBudget(reasoningEffort);
        if (provider === 'openai') {
          requestParams.providerOptions = {
            openai: {
              reasoningEffort,
            } satisfies OpenAIResponsesProviderOptions,
          };
        } else if (provider === 'anthropic') {
          requestParams.providerOptions = {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: thinkingBudget,
              },
            } satisfies AnthropicProviderOptions,
          };
        } else if (provider === 'gemini') {
          requestParams.providerOptions = {
            google: {
              thinkingConfig: {
                thinkingBudget,
              },
            } satisfies GoogleGenerativeAIProviderOptions,
          };
        } else if (provider === 'bedrock') {
          // The latest AI SDK doesn't work on Bedrock with reasoning.
          console.log(
            `Note: The current AI SDK doesn't work on Bedrock with reasoning. Model ${modelName} will use default reasoning settings.`
          );
          // requestParams.providerOptions = {
          //   bedrock: {
          //     reasoningConfig: { type: 'enabled', budgetTokens: thinkingBudget },
          //   } satisfies BedrockProviderOptions,
          // };
        } else if (provider === 'xai') {
          requestParams.providerOptions = {
            xai: {
              reasoningEffort,
            },
          };
        }
      }
    }

    const result = await generateText(requestParams);
    logResult(model, result);

    return result.text;
  } catch (error) {
    console.error(`LLM API error for model ${model}:`, error);
    process.exit(1);
  }
}

/**
 * Log the result of an LLM API call
 */
export function logResult(model: string, result: { text: string; usage?: unknown; finishReason?: string }): void {
  console.log(
    `${model}:`,
    JSON.stringify(
      {
        text: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
      },
      null,
      2
    )
  );
}

function getModelInstance(model: string): [LanguageModelV2, string, string] {
  // Only support llmlite format (provider/model)
  if (!model.includes('/')) {
    console.error(`Model must be in format 'provider/model'. Got: ${model}`);
    process.exit(1);
  }

  const [provider, ...modelParts] = model.split('/');
  const modelName = modelParts.join('/'); // Handle cases where model name itself contains '/'

  switch (provider) {
    case 'openai': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/openai
      const openaiProvider = createOpenAI();
      return [openaiProvider(modelName), provider, modelName];
    }

    case 'anthropic': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
      const anthropicProvider = createAnthropic();
      return [anthropicProvider(modelName), provider, modelName];
    }

    case 'gemini': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
      const googleProvider = createGoogleGenerativeAI();
      return [googleProvider(modelName), provider, modelName];
    }

    case 'azure': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/azure
      const azureProvider = createAzure();
      return [azureProvider(modelName), provider, modelName];
    }

    case 'bedrock': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock
      const bedrockProvider = createAmazonBedrock();
      return [bedrockProvider(modelName), provider, modelName];
    }

    case 'vertex': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex
      const vertexProvider = createVertex();
      return [vertexProvider(modelName), provider, modelName];
    }

    case 'xai': {
      // cf. https://ai-sdk.dev/providers/ai-sdk-providers/xai
      const grokProvider = createXai();
      return [grokProvider(modelName), provider, modelName];
    }

    default:
      console.error(
        `Unsupported provider: ${provider}. Supported providers: openai, azure, google, anthropic, bedrock, vertex, grok, openrouter, ollama`
      );
      process.exit(1);
  }
}

/**
 * Check if a model supports reasoning/thinking options
 */
export function supportsReasoningOptions(provider: string, modelName: string): boolean {
  switch (provider) {
    case 'openai':
    case 'azure':
      // OpenAI and Azure: only o1, o3, o4 series models support reasoning effort
      return /^(o1|o3|o4)/.test(modelName);

    case 'anthropic':
      // Anthropic: only Claude 3.7 and Claude 4 models support thinking budget
      return /^claude-(opus-4|sonnet-4|3-7-sonnet)/.test(modelName);

    case 'gemini':
      // Google: only Gemini 2.5 models support thinking budget
      return /^gemini-2\.5/.test(modelName);

    case 'bedrock':
      // Bedrock: only Anthropic Claude 3.7 and 4 models support reasoning
      return /^(us\.)?anthropic\.claude-(opus-4|sonnet-4|3-7-sonnet)/.test(modelName);

    case 'vertex':
      // Vertex: Gemini 2.5 models and Claude 3.7/4 models support thinking budget
      return /^gemini-2\.5/.test(modelName) || /^claude-(3-7-sonnet|opus-4|sonnet-4)/.test(modelName);

    case 'xai':
      // Grok: Grok 3 models support reasoning effort
      return /^grok-3/.test(modelName);

    default:
      return false;
  }
}

/**
 * Get thinking budget token count based on reasoning effort level
 */
function getThinkingBudget(reasoningEffort: ReasoningEffort): number {
  const tokenBudgets = {
    low: 4000, // 4K tokens
    medium: 8000, // 8K tokens
    high: 24000, // 24K tokens
  };

  return tokenBudgets[reasoningEffort];
}
