import { AIMessage, AIProviderConfig, AITool } from './providers/types';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai';

export interface AIGatewayConfig extends AIProviderConfig {
  provider: 'anthropic' | 'openai';
}

export interface AIRequest {
  task: string;
  messages: AIMessage[];
  tools?: AITool[];
  config?: Partial<AIGatewayConfig>;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  provider: string;
  model: string;
  durationMs: number;
}

const defaultConfig: AIGatewayConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,
  temperature: 0.7,
};

/**
 * AI Gateway - abstracción para múltiples proveedores de IA
 */
export class AIGateway {
  /**
   * Genera una respuesta usando el proveedor configurado
   */
  static async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const config = { ...defaultConfig, ...request.config };

    const apiKey =
      config.apiKey ||
      (config.provider === 'anthropic'
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY) ||
      '';

    if (!apiKey) {
      throw new Error(
        `Missing API key for provider: ${config.provider}`,
      );
    }

    let response;

    if (config.provider === 'anthropic') {
      const provider = new AnthropicProvider(apiKey);
      response = await provider.generateResponse(
        request.messages,
        config,
        request.tools,
      );
    } else if (config.provider === 'openai') {
      const provider = new OpenAIProvider(apiKey);
      response = await provider.generateResponse(
        request.messages,
        config,
        request.tools,
      );
    } else {
      throw new Error(`Unknown provider: ${config.provider}`);
    }

    const durationMs = Date.now() - startTime;

    console.log('[AI Gateway] Request completed:', {
      task: request.task,
      provider: config.provider,
      model: config.model,
      durationMs,
      cost: `$${response.cost.toFixed(4)}`,
    });

    return {
      content: response.content,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        cost: response.cost,
      },
      provider: config.provider,
      model: config.model,
      durationMs,
    };
  }

  /**
   * Estima el costo de una solicitud sin ejecutarla
   */
  static estimateCost(request: AIRequest): number {
    const config = { ...defaultConfig, ...request.config };
    const messageTokenCount = request.messages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0,
    );

    // Estimaciones aproximadas
    if (config.provider === 'anthropic') {
      const inputCost = (messageTokenCount / 1000000) * 3;
      const outputCost = ((config.maxTokens || 1024) / 1000000) * 15;
      return inputCost + outputCost;
    } else if (config.provider === 'openai') {
      const inputCost = (messageTokenCount / 1000000) * 0.03;
      const outputCost = ((config.maxTokens || 1024) / 1000000) * 0.06;
      return inputCost + outputCost;
    }

    return 0;
  }
}
