export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AITool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface AIProvider {
  generateResponse(
    messages: AIMessage[],
    config: Partial<AIProviderConfig>,
    tools?: AITool[],
  ): Promise<AIProviderResponse>;
}
