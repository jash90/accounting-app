import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * OpenRouter model information
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  description?: string;
}

/**
 * Raw model from OpenRouter API
 */
interface OpenRouterAPIModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  architecture?: {
    modality?: string[];
  };
  supported_parameters?: string[];
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  models: OpenRouterModel[];
  timestamp: number;
}

/**
 * Service for fetching and caching OpenRouter models
 */
@Injectable()
export class OpenRouterModelsService {
  private readonly logger = new Logger(OpenRouterModelsService.name);
  private readonly baseURL = 'https://openrouter.ai/api/v1';
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly TIMEOUT_MS = 10000; // 10 seconds

  // Per-tenant cache using API key suffix as key
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Get cache key from API key (use last 8 chars to avoid storing full key)
   */
  private getCacheKey(apiKey?: string): string {
    return apiKey ? apiKey.slice(-8) : 'default';
  }

  /**
   * Get available models (with caching)
   */
  async getModels(apiKey?: string): Promise<OpenRouterModel[]> {
    const cacheKey = this.getCacheKey(apiKey);
    const cached = this.cache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug('Returning cached OpenRouter models');
      return cached.models;
    }

    // Try to fetch from API
    try {
      const models = await this.fetchModelsFromAPI(apiKey);
      this.cache.set(cacheKey, {
        models,
        timestamp: Date.now(),
      });
      this.logger.log(`Fetched ${models.length} models from OpenRouter API`);
      return models;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch models from API: ${error instanceof Error ? error.message : error}`,
      );
      // Return fallback models
      const fallbackModels = this.getDefaultModels();
      this.cache.set(cacheKey, {
        models: fallbackModels,
        timestamp: Date.now(),
      });
      return fallbackModels;
    }
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async fetchModelsFromAPI(apiKey?: string): Promise<OpenRouterModel[]> {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.get<{ data: OpenRouterAPIModel[] }>(
      `${this.baseURL}/models`,
      {
        headers,
        timeout: this.TIMEOUT_MS,
      },
    );

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    return response.data.data.map((model) => this.transformModel(model));
  }

  /**
   * Transform API response to internal model format
   */
  private transformModel(apiModel: OpenRouterAPIModel): OpenRouterModel {
    // Extract provider from model ID (e.g., "anthropic/claude-3.5-sonnet" -> "Anthropic")
    const provider = this.extractProvider(apiModel.id);

    // Parse pricing (comes as string like "0.003")
    const costPer1kInput = parseFloat(apiModel.pricing?.prompt || '0') * 1000;
    const costPer1kOutput = parseFloat(apiModel.pricing?.completion || '0') * 1000;

    // Check for vision support
    const supportsVision =
      apiModel.architecture?.modality?.includes('image') ?? false;

    // Check for function calling support
    const supportsFunctionCalling =
      apiModel.supported_parameters?.includes('tools') ||
      apiModel.supported_parameters?.includes('functions') ||
      false;

    return {
      id: apiModel.id,
      name: apiModel.name,
      provider,
      description: apiModel.description,
      contextWindow: apiModel.context_length || 0,
      maxOutputTokens: apiModel.top_provider?.max_completion_tokens || 4096,
      costPer1kInput,
      costPer1kOutput,
      supportsVision,
      supportsFunctionCalling,
    };
  }

  /**
   * Extract provider name from model ID
   */
  private extractProvider(modelId: string): string {
    const providerMap: Record<string, string> = {
      anthropic: 'Anthropic',
      openai: 'OpenAI',
      google: 'Google',
      'meta-llama': 'Meta',
      mistralai: 'Mistral',
      cohere: 'Cohere',
      deepseek: 'DeepSeek',
      'perplexity': 'Perplexity',
      'microsoft': 'Microsoft',
      'qwen': 'Qwen',
      'nous': 'Nous Research',
      'nvidia': 'NVIDIA',
    };

    const prefix = modelId.split('/')[0];
    return providerMap[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  /**
   * Clear cache (force refresh on next request)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('OpenRouter model cache cleared');
  }

  /**
   * Get default/fallback models when API is unavailable
   */
  getDefaultModels(): OpenRouterModel[] {
    return [
      // Anthropic
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        description: 'Most intelligent model, best for complex tasks',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        costPer1kInput: 3.0,
        costPer1kOutput: 15.0,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        description: 'Fastest and most cost-effective',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1kInput: 0.25,
        costPer1kOutput: 1.25,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        description: 'Most powerful for highly complex tasks',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        costPer1kInput: 15.0,
        costPer1kOutput: 75.0,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      // OpenAI
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        description: 'Most advanced GPT-4 model',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 5.0,
        costPer1kOutput: 15.0,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        description: 'Affordable and intelligent small model',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        costPer1kInput: 0.15,
        costPer1kOutput: 0.6,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        description: 'GPT-4 Turbo with vision capabilities',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 10.0,
        costPer1kOutput: 30.0,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'openai/o1-preview',
        name: 'o1 Preview',
        provider: 'OpenAI',
        description: 'Reasoning model for complex problems',
        contextWindow: 128000,
        maxOutputTokens: 32768,
        costPer1kInput: 15.0,
        costPer1kOutput: 60.0,
        supportsVision: false,
        supportsFunctionCalling: false,
      },
      {
        id: 'openai/o1-mini',
        name: 'o1 Mini',
        provider: 'OpenAI',
        description: 'Fast reasoning model',
        contextWindow: 128000,
        maxOutputTokens: 65536,
        costPer1kInput: 3.0,
        costPer1kOutput: 12.0,
        supportsVision: false,
        supportsFunctionCalling: false,
      },
      // Google
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        description: 'Google\'s most capable model',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 2.5,
        costPer1kOutput: 7.5,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'google/gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        description: 'Fast and efficient next-gen model',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      // Meta
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        provider: 'Meta',
        description: 'Powerful open-source model',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        costPer1kInput: 0.52,
        costPer1kOutput: 0.75,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        provider: 'Meta',
        description: 'Fast and efficient open-source model',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        costPer1kInput: 0.055,
        costPer1kOutput: 0.055,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B',
        provider: 'Meta',
        description: 'Largest open-source model',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        costPer1kInput: 3.0,
        costPer1kOutput: 3.0,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      // Mistral
      {
        id: 'mistralai/mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral',
        description: 'Most capable Mistral model',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 2.0,
        costPer1kOutput: 6.0,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B',
        provider: 'Mistral',
        description: 'Efficient mixture of experts model',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        costPer1kInput: 0.24,
        costPer1kOutput: 0.24,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      // DeepSeek
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        description: 'Capable and cost-effective model',
        contextWindow: 64000,
        maxOutputTokens: 4096,
        costPer1kInput: 0.14,
        costPer1kOutput: 0.28,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'deepseek/deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'DeepSeek',
        description: 'Optimized for coding tasks',
        contextWindow: 64000,
        maxOutputTokens: 4096,
        costPer1kInput: 0.14,
        costPer1kOutput: 0.28,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      // Cohere
      {
        id: 'cohere/command-r-plus',
        name: 'Command R+',
        provider: 'Cohere',
        description: 'Enterprise-grade conversational model',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 2.5,
        costPer1kOutput: 10.0,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'cohere/command-r',
        name: 'Command R',
        provider: 'Cohere',
        description: 'Efficient conversational model',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 0.15,
        costPer1kOutput: 0.6,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      // Perplexity
      {
        id: 'perplexity/llama-3.1-sonar-large-128k-online',
        name: 'Sonar Large Online',
        provider: 'Perplexity',
        description: 'Real-time web search model',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        costPer1kInput: 1.0,
        costPer1kOutput: 1.0,
        supportsVision: false,
        supportsFunctionCalling: false,
      },
    ];
  }
}
