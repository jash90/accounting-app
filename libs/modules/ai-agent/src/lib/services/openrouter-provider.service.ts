import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  AIProviderService,
  ChatMessage,
  ChatCompletionResponse,
  EmbeddingResponse,
} from './ai-provider.interface';
import { AIProviderError } from './openai-provider.service';

/**
 * OpenRouter provider service with retry logic and error handling.
 */
@Injectable()
export class OpenRouterProviderService extends AIProviderService {
  private readonly logger = new Logger(OpenRouterProviderService.name);
  private readonly baseURL = 'https://openrouter.ai/api/v1';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly BASE_RETRY_DELAY_MS = 1000; // 1 second base delay

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
        return await operation();
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
   * Determine if an error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on rate limits, server errors, and timeouts
      const retryableStatuses = [429, 500, 502, 503, 504];
      if (status && retryableStatuses.includes(status)) {
        return true;
      }
      // Retry on network errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
      }
    }
    return false;
  }

  /**
   * Map errors to user-friendly messages.
   */
  private mapToUserFriendlyError(error: unknown, operationName: string): AIProviderError {
    const technicalDetails = error instanceof Error ? error.message : String(error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      switch (status) {
        case 401:
          return new AIProviderError(
            'Invalid API key. Please check your OpenRouter configuration.',
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
          if (error.code === 'ECONNABORTED') {
            return new AIProviderError(
              'Request timed out. Please try a shorter message or try again later.',
              technicalDetails,
              HttpStatus.GATEWAY_TIMEOUT,
            );
          }
          return new AIProviderError(
            'An error occurred while processing your request.',
            technicalDetails,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
      }
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
    return this.withRetry(async () => {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Accounting App',
          },
          timeout: this.TIMEOUT_MS,
        },
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;

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
    // OpenRouter doesn't natively support embeddings
    throw new AIProviderError(
      'OpenRouter does not support embeddings. Please use OpenAI provider for RAG features.',
      'Embeddings not supported by OpenRouter',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000, // 10 second timeout for validation
      });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.logger.debug('API key validation failed: Invalid key');
        return false;
      }
      this.logger.warn(`API key validation failed: ${(error as Error).message}`);
      return false;
    }
  }
}
