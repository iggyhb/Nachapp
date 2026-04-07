import Anthropic from '@anthropic-ai/sdk';
import {
  AIMessage,
  AIProviderConfig,
  AIProviderResponse,
  AITool,
} from './types';

/**
 * Proveedor de IA para Anthropic Claude
 */
export class AnthropicProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  async generateResponse(
    messages: AIMessage[],
    config: Partial<AIProviderConfig>,
    tools?: AITool[],
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();

    const anthropicMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      }));

    const response = await this.client.messages.create({
      model: config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.7,
      system:
        messages.find((m) => m.role === 'system')?.content ||
        'You are a helpful assistant.',
      messages: anthropicMessages,
      tools: tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object' as const,
          ...tool.inputSchema,
        },
      })),
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    const durationMs = Date.now() - startTime;

    // Precios de Anthropic (actualizar según documentación)
    const inputCost = (response.usage.input_tokens / 1000000) * 3; // $3 per 1M input tokens
    const outputCost = (response.usage.output_tokens / 1000000) * 15; // $15 per 1M output tokens

    console.log('[AI] Anthropic request:', {
      model: config.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      cost: `$${(inputCost + outputCost).toFixed(4)}`,
      durationMs,
    });

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      cost: inputCost + outputCost,
    };
  }
}
