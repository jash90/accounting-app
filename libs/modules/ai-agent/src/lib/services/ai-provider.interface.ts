import { HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Custom error class for AI provider errors with user-friendly messages.
 */
export class AIProviderError extends HttpException {
  constructor(
    public readonly userMessage: string,
    public readonly technicalDetails: string,
    status: HttpStatus = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super(userMessage, status);
  }
}

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

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  error?: string;
  /** Technical error details for debugging (logged server-side, not shown to end users) */
  technicalDetails?: string;
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
   * Generate chat completion with streaming support.
   * Returns an Observable that emits ChatStreamChunk events.
   */
  abstract chatStream(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Observable<ChatStreamChunk>;

  /**
   * Generate embedding for text
   * @param text - Text to generate embedding for
   * @param apiKey - API key for the provider
   * @param model - Optional model to use (defaults to provider-specific default)
   */
  abstract generateEmbedding(text: string, apiKey: string, model?: string): Promise<EmbeddingResponse>;

  /**
   * Validate API key
   */
  abstract validateApiKey(apiKey: string): Promise<boolean>;
}
