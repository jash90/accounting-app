import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AIProviderService,
  AIProviderError,
  ChatMessage,
  ChatCompletionResponse,
  EmbeddingResponse,
} from './ai-provider.interface';

/**
 * OpenAI provider service with lazy singleton client caching.
 * Caches OpenAI clients by API key to avoid creating new instances for every request.
 */
@Injectable()
export class OpenAIProviderService extends AIProviderService {
  private readonly logger = new Logger(OpenAIProviderService.name);
  private readonly clientCache = new Map<string, { client: OpenAI; lastUsed: number }>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly BASE_RETRY_DELAY_MS = 1000; // 1 second base delay

  /**
   * Get or create an OpenAI client for the given API key.
   * Clients are cached and reused for better performance.
   */
  private getClient(apiKey: string): OpenAI {
    const cached = this.clientCache.get(apiKey);
    const now = Date.now();

    if (cached) {
      cached.lastUsed = now;
      return cached.client;
    }

    // Clean up stale clients periodically
    this.cleanupStaleClients(now);

    const client = new OpenAI({ apiKey });
    this.clientCache.set(apiKey, { client, lastUsed: now });
    this.logger.debug(`Created new OpenAI client (cache size: ${this.clientCache.size})`);

    return client;
  }

  /**
   * Remove clients that haven't been used recently.
   */
  private cleanupStaleClients(now: number): void {
    for (const [key, value] of this.clientCache.entries()) {
      if (now - value.lastUsed > this.CACHE_TTL_MS) {
        this.clientCache.delete(key);
        this.logger.debug(`Removed stale OpenAI client from cache`);
      }
    }
  }

  /**
   * Execute an operation with retry logic and exponential backoff.
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.withTimeout(operation(), operationName);
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === this.MAX_RETRIES) {
          this.logger.error(
            `${operationName} failed after ${attempt} attempt(s): ${lastError.message}`,
          );
          throw this.mapToUserFriendlyError(error, operationName);
        }

        const delay = this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `${operationName} attempt ${attempt}/${this.MAX_RETRIES} failed, retrying in ${delay}ms: ${lastError.message}`,
        );
        await this.sleep(delay);
      }
    }

    throw this.mapToUserFriendlyError(lastError, operationName);
  }

  /**
   * Wrap a promise with a timeout.
   */
  private async withTimeout<T>(promise: Promise<T>, operationName: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${this.TIMEOUT_MS}ms`));
      }, this.TIMEOUT_MS);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Determine if an error is retryable (rate limits, network issues, server errors).
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      // Retry on rate limits, server errors, and timeouts
      const retryableStatuses = [429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status ?? 0);
    }

    // Retry on network errors
    if (error instanceof Error) {
      const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      return networkErrors.some(code => error.message.includes(code));
    }

    return false;
  }

  /**
   * Map OpenAI errors to user-friendly messages.
   */
  private mapToUserFriendlyError(error: unknown, operationName: string): AIProviderError {
    const technicalDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          return new AIProviderError(
            'Invalid API key. Please check your AI configuration.',
            technicalDetails,
            HttpStatus.UNAUTHORIZED,
          );
        case 429:
          return new AIProviderError(
            'AI service is temporarily overloaded. Please try again in a moment.',
            technicalDetails,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        case 400:
          return new AIProviderError(
            'Invalid request to AI service. Please try a different message.',
            technicalDetails,
            HttpStatus.BAD_REQUEST,
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new AIProviderError(
            'AI service is temporarily unavailable. Please try again later.',
            technicalDetails,
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        default:
          return new AIProviderError(
            'An error occurred while processing your request.',
            technicalDetails,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
      }
    }

    // Timeout error
    if (technicalDetails.includes('timed out')) {
      return new AIProviderError(
        'Request timed out. Please try a shorter message or try again later.',
        technicalDetails,
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    // Network errors
    if (technicalDetails.includes('ECONNREFUSED') || technicalDetails.includes('ENOTFOUND')) {
      return new AIProviderError(
        'Unable to connect to AI service. Please check your network connection.',
        technicalDetails,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return new AIProviderError(
      'An unexpected error occurred. Please try again.',
      technicalDetails,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Sleep helper for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Promise<ChatCompletionResponse> {
    const openai = this.getClient(apiKey);

    return this.withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];
      const usage = completion.usage;

      return {
        content: choice.message.content || '',
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      };
    }, 'Chat completion');
  }

  async generateEmbedding(
    text: string,
    apiKey: string,
  ): Promise<EmbeddingResponse> {
    const openai = this.getClient(apiKey);

    return this.withRetry(async () => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokens: response.usage.total_tokens,
      };
    }, 'Generate embedding');
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const openai = this.getClient(apiKey);
      await this.withTimeout(openai.models.list(), 'API key validation');
      return true;
    } catch (error) {
      if (error instanceof OpenAI.APIError && error.status === 401) {
        // Invalid API key - this is expected for validation
        this.logger.debug('API key validation failed: Invalid key');
        return false;
      }
      // Log unexpected errors but still return false
      this.logger.warn(`API key validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Invalidate cached client for a specific API key.
   * Use when an API key is rotated or becomes invalid.
   */
  invalidateClient(apiKey: string): void {
    if (this.clientCache.delete(apiKey)) {
      this.logger.debug('Invalidated OpenAI client from cache');
    }
  }
}
