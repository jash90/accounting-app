import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
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
 * OpenRouter provider service with retry logic and error handling.
 */
@Injectable()
export class OpenRouterProviderService extends AIProviderService {
  private readonly logger = new Logger(OpenRouterProviderService.name);
  private readonly baseURL = 'https://openrouter.ai/api/v1';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 180000; // 3 minutes - generous timeout for complex AI responses
  private readonly BASE_RETRY_DELAY_MS = 1000; // 1 second base delay
  private readonly httpReferer = process.env.OPENROUTER_REFERER || 'http://localhost:3000';
  private readonly xTitle = process.env.OPENROUTER_X_TITLE || 'Accounting App';

  /**
   * Model prefixes that don't support system role (developer instructions).
   * These models require system messages to be merged into user messages.
   */
  private readonly MODELS_WITHOUT_SYSTEM_ROLE = [
    'google/gemma',  // All Gemma models (gemma-2, gemma-3, etc.)
  ];

  /**
   * Model prefixes for reasoning models that don't support streaming.
   * These include OpenAI's o1/o3 models when accessed through OpenRouter.
   */
  private readonly REASONING_MODEL_PREFIXES = ['openai/o1', 'openai/o3'];

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
          // Log the actual API response for debugging
          if (axios.isAxiosError(error) && error.response?.data) {
            this.logger.error(
              `API Response: ${this.safeStringify(error.response.data)}`,
            );
          }
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
    let technicalDetails = error instanceof Error ? error.message : String(error);

    // Include API response data in technical details for better debugging
    if (axios.isAxiosError(error) && error.response?.data) {
      const apiError = error.response.data;
      // Safely extract error message - avoid JSON.stringify on objects that may have circular refs
      const apiErrorMessage =
        apiError?.error?.message ||
        apiError?.message ||
        (typeof apiError === 'string' ? apiError : this.safeStringify(apiError));
      technicalDetails = `${technicalDetails} | API Error: ${apiErrorMessage}`;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const apiError = error.response?.data?.error;

      switch (status) {
        case 401:
          return new AIProviderError(
            'Invalid API key. Please check your OpenRouter configuration.',
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
          // Include specific API error message if available
          const badRequestMessage = apiError?.message
            ? `Invalid request: ${apiError.message}`
            : 'Invalid request to AI service. Please try a different message.';
          return new AIProviderError(
            badRequestMessage,
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

  /**
   * Safely stringify an object, handling circular references.
   * Axios errors can contain circular references to sockets/parsers.
   */
  private safeStringify(obj: unknown): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch {
      return String(obj);
    }
  }

  /**
   * Check if a model supports the system role in messages.
   */
  private modelSupportsSystemRole(model: string): boolean {
    const modelLower = model.toLowerCase();
    return !this.MODELS_WITHOUT_SYSTEM_ROLE.some(prefix =>
      modelLower.startsWith(prefix)
    );
  }

  /**
   * Check if model is a reasoning model that doesn't support streaming.
   * OpenRouter uses prefixed model names like "openai/o1-mini".
   */
  private isReasoningModel(model: string): boolean {
    const modelLower = model.toLowerCase();
    return this.REASONING_MODEL_PREFIXES.some(
      (prefix) => modelLower.startsWith(prefix),
    );
  }

  /**
   * Transform messages for models that don't support system role.
   * Merges system messages into the first user message.
   */
  private transformMessagesForModel(
    messages: ChatMessage[],
    model: string,
  ): ChatMessage[] {
    if (this.modelSupportsSystemRole(model)) {
      return messages;
    }

    // Extract system and non-system messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    if (systemMessages.length === 0) {
      return nonSystemMessages;
    }

    this.logger.debug(
      `Model ${model} doesn't support system role, merging ${systemMessages.length} system message(s) into user message`,
    );

    // Combine all system message content
    const systemContent = systemMessages.map(m => m.content).join('\n\n');

    // Find first user message and prepend system content
    const firstUserIndex = nonSystemMessages.findIndex(m => m.role === 'user');
    if (firstUserIndex >= 0) {
      const originalUserContent = nonSystemMessages[firstUserIndex].content;
      nonSystemMessages[firstUserIndex] = {
        role: 'user',
        content: `[System Instructions]\n${systemContent}\n\n[User Message]\n${originalUserContent}`,
      };
    } else {
      // No user message found, add system content as first user message
      nonSystemMessages.unshift({
        role: 'user',
        content: `[System Instructions]\n${systemContent}`,
      });
    }

    return nonSystemMessages;
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
  ): Promise<ChatCompletionResponse> {
    // Transform messages for models that don't support system role
    const transformedMessages = this.transformMessagesForModel(messages, model);
    const isReasoning = this.isReasoningModel(model);

    if (isReasoning) {
      this.logger.debug(
        `Using reasoning model parameters for ${model} (max_completion_tokens, no temperature)`,
      );
    }

    this.logger.debug(`Sending chat request to OpenRouter: model=${model}, messages=${transformedMessages.length}, temp=${temperature}, maxTokens=${maxTokens}`);

    return this.withRetry(async () => {
      // o1/o3 models use max_completion_tokens and don't support temperature
      const requestBody = {
        model,
        messages: transformedMessages,
        ...(isReasoning
          ? { max_completion_tokens: maxTokens }
          : { temperature, max_tokens: maxTokens }),
      };

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': this.httpReferer,
            'X-Title': this.xTitle,
          },
          timeout: this.TIMEOUT_MS,
        },
      );

      // Validate response structure
      if (!response?.data?.choices?.length) {
        throw new AIProviderError(
          'Invalid response from AI service',
          'Response missing choices array',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const choice = response.data.choices[0];
      if (!choice?.message) {
        throw new AIProviderError(
          'Invalid response from AI service',
          'Response missing message content',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const usage = response.data.usage;

      return {
        content: choice.message.content || '',
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
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
      const transformedMessages = this.transformMessagesForModel(messages, model);

      this.logger.debug(
        `Starting streaming chat request to OpenRouter: model=${model}, messages=${transformedMessages.length}`,
      );

      axios
        .post(
          `${this.baseURL}/chat/completions`,
          {
            model,
            messages: transformedMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': this.httpReferer,
              'X-Title': this.xTitle,
            },
            responseType: 'stream',
            timeout: this.TIMEOUT_MS,
          },
        )
        .then((response) => {
          let buffer = '';
          let totalContent = '';
          let inputTokens = 0;
          let outputTokens = 0;

          response.data.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();

            // Process complete SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === '') continue;

              // Handle SSE data lines
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.slice(6); // Remove 'data: ' prefix

                // Check for stream end
                if (data === '[DONE]') {
                  this.logger.debug(
                    `Streaming complete: totalContent=${totalContent.length} chars`,
                  );
                  subscriber.next({
                    type: 'done',
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                  });
                  subscriber.complete();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);

                  // Check for error in stream
                  if (parsed.error) {
                    const errorCode = parsed.error.code || 'UNKNOWN';
                    const errorMessage =
                      parsed.error.message || this.safeStringify(parsed.error);
                    const fullError = this.safeStringify(parsed.error);
                    this.logger.error(`Stream error from OpenRouter: [${errorCode}] ${errorMessage}`);
                    this.logger.error(`Full error payload: ${fullError}`);
                    subscriber.next({
                      type: 'error',
                      error: errorMessage,
                      technicalDetails: `Code: ${errorCode}, Details: ${fullError}`,
                    });
                    subscriber.complete();
                    return;
                  }

                  // Extract content delta
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta?.content) {
                    totalContent += delta.content;
                    subscriber.next({
                      type: 'content',
                      content: delta.content,
                    });
                  }

                  // Update token counts if available
                  if (parsed.usage) {
                    inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
                    outputTokens = parsed.usage.completion_tokens ?? outputTokens;
                  }
                } catch (parseError) {
                  // Skip non-JSON lines (like comments or empty data)
                  this.logger.debug(`Skipping non-JSON SSE data: ${data}`);
                }
              }
            }
          });

          response.data.on('end', () => {
            // Process any remaining buffer
            if (buffer.trim()) {
              this.logger.debug(`Processing remaining buffer: ${buffer}`);
            }

            // Ensure completion if not already done
            if (!subscriber.closed) {
              subscriber.next({
                type: 'done',
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
              });
              subscriber.complete();
            }
          });

          response.data.on('error', (error: Error) => {
            this.logger.error(`Stream error: ${error.message}`);
            subscriber.next({
              type: 'error',
              error: error.message,
            });
            subscriber.complete();
          });
        })
        .catch((error) => {
          // Log full error details for debugging
          if (axios.isAxiosError(error)) {
            this.logger.error(`Streaming request error status: ${error.response?.status}`);
            if (error.response?.data) {
              this.logger.error(
                `Streaming API Response: ${this.safeStringify(error.response.data)}`,
              );
            }
          }

          const aiError = this.mapToUserFriendlyError(error, 'Streaming chat');
          this.logger.error(`Streaming request failed: ${aiError.message}`);
          this.logger.error(`Technical details: ${aiError.technicalDetails}`);

          subscriber.next({
            type: 'error',
            error: aiError.message,
            technicalDetails: aiError.technicalDetails,
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
            technicalDetails: aiError.technicalDetails,
          });
          subscriber.complete();
        });
    });
  }

  async generateEmbedding(
    text: string,
    apiKey: string,
    model?: string,
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
