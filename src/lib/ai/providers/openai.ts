import OpenAI from 'openai';
import {
  AIMessage,
  AIProviderConfig,
  AIProviderResponse,
  AITool,
} from './types';

/**
 * Proveedor de IA para OpenAI
 */
export class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
    });
  }

  async generateResponse(
    messages: AIMessage[],
    config: Partial<AIProviderConfig>,
    tools?: AITool[],
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();

    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const response = await this.client.chat.completions.create({
      model: config.model || 'gpt-4-turbo',
      max_tokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.7,
      messages: openaiMessages,
      tools: tools?.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      })),
    });

    const content =
      response.choices[0]?.message?.content ||
      response.choices[0]?.message?.tool_calls?.[0]?.function?.name ||
      '';

    const durationMs = Date.now() - startTime;

    // Precios de OpenAI (actualizar según documentación)
    const inputCost = (response.usage?.prompt_tokens || 0 / 1000000) * 0.03; // $0.03 per 1M input tokens
    const outputCost = (response.usage?.completion_tokens || 0 / 1000000) * 0.06; // $0.06 per 1M output tokens

    console.log('[AI] OpenAI request:', {
      model: config.model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      cost: `$${(inputCost + outputCost).toFixed(4)}`,
      durationMs,
    });

    return {
      content,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cost: inputCost + outputCost,
    };
  }
}
