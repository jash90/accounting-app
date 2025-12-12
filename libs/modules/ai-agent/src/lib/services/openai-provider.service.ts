import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { Observable } from 'rxjs';
import {
  AIProviderService,
  AIProviderError,
  ChatMessage,
  ChatCompletionResponse,
  ChatStreamChunk,
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
  private readonly TIMEOUT_MS = 180000; // 3 minutes - generous timeout for complex AI responses
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
            HttpStatus.BAD_REQUEST, // Changed from UNAUTHORIZED to prevent frontend from interpreting as JWT auth failure
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

  /**
   * Check if model is a reasoning model that doesn't support streaming.
   * o1, o1-mini, o1-preview, o3, o3-mini don't support streaming
   * and require max_completion_tokens instead of max_tokens.
   */
  private isReasoningModel(model: string): boolean {
    const reasoningModelPrefixes = ['o1', 'o3'];
    const lowerModel = model.toLowerCase();
    return reasoningModelPrefixes.some(
      (prefix) => lowerModel === prefix || lowerModel.startsWith(`${prefix}-`),
    );
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Promise<ChatCompletionResponse> {
    const openai = this.getClient(apiKey);
    const isReasoning = this.isReasoningModel(model);

    if (isReasoning) {
      this.logger.debug(
        `Using reasoning model parameters for ${model} (max_completion_tokens, no temperature)`,
      );
    }

    return this.withRetry(async () => {
      // o1/o3 models use max_completion_tokens and don't support temperature
      const completion = await openai.chat.completions.create({
        model,
        messages,
        ...(isReasoning
          ? { max_completion_tokens: maxTokens }
          : { temperature, max_tokens: maxTokens }),
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

  /**
   * Stream chat completion with real-time token delivery.
   * Returns an Observable that emits ChatStreamChunk events.
   *
   * Note: o1/o3 reasoning models don't support streaming, so they
   * automatically fall back to non-streaming mode.
   */
  chatStream(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Observable<ChatStreamChunk> {
    // o1/o3 models don't support streaming - fall back to non-streaming
    if (this.isReasoningModel(model)) {
      this.logger.debug(
        `Model ${model} doesn't support streaming, using non-streaming fallback`,
      );
      return this.chatWithFallback(messages, model, temperature, maxTokens, apiKey);
    }

    return new Observable((subscriber) => {
      const openai = this.getClient(apiKey);

      this.logger.debug(
        `Starting streaming chat request to OpenAI: model=${model}, messages=${messages.length}`,
      );

      openai.chat.completions
        .create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        })
        .then(async (stream) => {
          let totalContent = '';

          try {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta;
              const content = delta?.content;

              if (content) {
                totalContent += content;
                subscriber.next({
                  type: 'content',
                  content,
                });
              }

              // Check if this is the final chunk
              if (chunk.choices[0]?.finish_reason) {
                this.logger.debug(
                  `Streaming complete: totalContent=${totalContent.length} chars`,
                );
              }
            }

            // OpenAI SDK doesn't provide token counts during streaming
            // They're only available after the stream is complete via usage endpoints
            subscriber.next({
              type: 'done',
              // Token counts not available in streaming mode for OpenAI
              // Frontend should re-fetch conversation to get accurate counts
            });
            subscriber.complete();
          } catch (streamError) {
            const error = streamError as Error;
            this.logger.error(`Stream processing error: ${error.message}`);
            subscriber.next({
              type: 'error',
              error: error.message,
            });
            subscriber.complete();
          }
        })
        .catch((error) => {
          const aiError = this.mapToUserFriendlyError(error, 'Streaming chat');
          this.logger.error(`Streaming request failed: ${aiError.message}`);
          subscriber.next({
            type: 'error',
            error: aiError.message,
          });
          subscriber.complete();
        });
    });
  }

  /**
   * Non-streaming fallback for models that don't support streaming.
   * Emits the entire response as a single content chunk, then done.
   */
  private chatWithFallback(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Observable<ChatStreamChunk> {
    return new Observable((subscriber) => {
      this.chat(messages, model, temperature, maxTokens, apiKey)
        .then((response) => {
          // Emit content as single chunk
          subscriber.next({
            type: 'content',
            content: response.content,
          });
          // Emit done with token counts
          subscriber.next({
            type: 'done',
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            totalTokens: response.totalTokens,
          });
          subscriber.complete();
        })
        .catch((error) => {
          const aiError =
            error instanceof AIProviderError
              ? error
              : this.mapToUserFriendlyError(error, 'Chat (non-streaming fallback)');
          this.logger.error(`Non-streaming fallback failed: ${aiError.message}`);
          subscriber.next({
            type: 'error',
            error: aiError.message,
          });
          subscriber.complete();
        });
    });
  }

  async generateEmbedding(
    text: string,
    apiKey: string,
    model: string = 'text-embedding-ada-002',
  ): Promise<EmbeddingResponse> {
    const openai = this.getClient(apiKey);

    return this.withRetry(async () => {
      const response = await openai.embeddings.create({
        model,
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
