export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

export abstract class AIProviderService {
  /**
   * Generate chat completion
   */
  abstract chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Promise<ChatCompletionResponse>;

  /**
   * Generate embedding for text
   */
  abstract generateEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse>;

  /**
   * Validate API key
   */
  abstract validateApiKey(apiKey: string): Promise<boolean>;
}
