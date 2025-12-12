import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * OpenAI model information
 */
export interface OpenAIModel {
  id: string;
  name: string;
  description: string;
  created?: number;
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  models: OpenAIModel[];
  timestamp: number;
}

/**
 * Service for fetching and caching OpenAI models
 */
@Injectable()
export class OpenAIModelsService {
  private readonly logger = new Logger(OpenAIModelsService.name);
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly TIMEOUT_MS = 10000; // 10 seconds

  // Per-tenant cache using API key suffix as key
  private chatModelsCache: Map<string, CacheEntry> = new Map();
  private embeddingModelsCache: Map<string, CacheEntry> = new Map();

  /**
   * Get cache key from API key (use last 8 chars to avoid storing full key)
   */
  private getCacheKey(apiKey: string): string {
    return apiKey.slice(-8);
  }

  /**
   * Get available chat models (with caching)
   */
  async getChatModels(apiKey: string): Promise<OpenAIModel[]> {
    const cacheKey = this.getCacheKey(apiKey);
    const cached = this.chatModelsCache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug('Returning cached OpenAI chat models');
      return cached.models;
    }

    // Try to fetch from API
    try {
      const allModels = await this.fetchModelsFromAPI(apiKey);
      const chatModels = allModels
        .filter((m) => this.isChatModel(m.id))
        .map((m) => ({
          id: m.id,
          name: this.formatModelName(m.id),
          description: this.getModelDescription(m.id),
          created: m.created,
        }))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

      this.chatModelsCache.set(cacheKey, {
        models: chatModels,
        timestamp: Date.now(),
      });
      this.logger.log(`Fetched ${chatModels.length} chat models from OpenAI API`);
      return chatModels;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch models from OpenAI API: ${error instanceof Error ? error.message : error}`,
      );
      // Return fallback models
      const fallbackModels = this.getDefaultChatModels();
      this.chatModelsCache.set(cacheKey, {
        models: fallbackModels,
        timestamp: Date.now(),
      });
      return fallbackModels;
    }
  }

  /**
   * Get available embedding models (with caching)
   */
  async getEmbeddingModels(apiKey: string): Promise<OpenAIModel[]> {
    const cacheKey = this.getCacheKey(apiKey);
    const cached = this.embeddingModelsCache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug('Returning cached OpenAI embedding models');
      return cached.models;
    }

    // Try to fetch from API
    try {
      const allModels = await this.fetchModelsFromAPI(apiKey);
      const embeddingModels = allModels
        .filter((m) => this.isEmbeddingModel(m.id))
        .map((m) => ({
          id: m.id,
          name: this.formatModelName(m.id),
          description: this.getEmbeddingModelDescription(m.id),
          created: m.created,
        }))
        .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

      this.embeddingModelsCache.set(cacheKey, {
        models: embeddingModels,
        timestamp: Date.now(),
      });
      this.logger.log(`Fetched ${embeddingModels.length} embedding models from OpenAI API`);
      return embeddingModels;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch embedding models from OpenAI API: ${error instanceof Error ? error.message : error}`,
      );
      // Return fallback models
      const fallbackModels = this.getDefaultEmbeddingModels();
      this.embeddingModelsCache.set(cacheKey, {
        models: fallbackModels,
        timestamp: Date.now(),
      });
      return fallbackModels;
    }
  }

  /**
   * Fetch models from OpenAI API with timeout
   */
  private async fetchModelsFromAPI(apiKey: string): Promise<OpenAI.Models.Model[]> {
    const openai = new OpenAI({ apiKey, timeout: this.TIMEOUT_MS });
    const response = await openai.models.list();
    return response.data;
  }

  /**
   * Check if model is a chat model
   */
  private isChatModel(modelId: string): boolean {
    // Use 'gpt-' prefix to match all GPT versions (3.5, 4, 5, 6, etc.)
    const chatModelPrefixes = ['gpt-', 'o1', 'o3', 'chatgpt'];
    const lowerModel = modelId.toLowerCase();

    // Exclude specific non-chat models
    if (lowerModel.includes('instruct') && !lowerModel.includes('turbo-instruct')) {
      return false;
    }
    if (lowerModel.includes('embedding')) return false;
    if (lowerModel.includes('whisper')) return false;
    if (lowerModel.includes('tts')) return false;
    if (lowerModel.includes('dall-e')) return false;
    if (lowerModel.includes('babbage')) return false;
    if (lowerModel.includes('davinci')) return false;

    return chatModelPrefixes.some((prefix) => lowerModel.startsWith(prefix));
  }

  /**
   * Check if model is an embedding model
   */
  private isEmbeddingModel(modelId: string): boolean {
    const lowerModel = modelId.toLowerCase();
    return lowerModel.includes('embedding');
  }

  /**
   * Format model ID to a friendly name
   */
  private formatModelName(modelId: string): string {
    // Common name mappings
    const nameMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
      'gpt-4': 'GPT-4',
      'gpt-4-0613': 'GPT-4 (0613)',
      'gpt-4-0314': 'GPT-4 (0314)',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
      'o1-preview': 'o1 Preview',
      'o1-mini': 'o1 Mini',
      'o1': 'o1',
      'o3-mini': 'o3 Mini',
      'text-embedding-3-small': 'Text Embedding 3 Small',
      'text-embedding-3-large': 'Text Embedding 3 Large',
      'text-embedding-ada-002': 'Text Embedding Ada 002',
    };

    if (nameMap[modelId]) {
      return nameMap[modelId];
    }

    // Auto-format: capitalize and replace dashes with spaces
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Get description for chat models
   */
  private getModelDescription(modelId: string): string {
    const descriptionMap: Record<string, string> = {
      'gpt-4o': 'Most capable model, multimodal (text + vision)',
      'gpt-4o-mini': 'Fast and affordable, great for most tasks',
      'gpt-4-turbo': 'High capability with vision support',
      'gpt-4-turbo-preview': 'Preview version of GPT-4 Turbo',
      'gpt-4': 'Original GPT-4, high capability',
      'gpt-3.5-turbo': 'Fast and cost-effective',
      'gpt-3.5-turbo-16k': 'Extended context window (16K)',
      'o1-preview': 'Advanced reasoning for complex problems',
      'o1-mini': 'Efficient reasoning model',
      'o1': 'Reasoning model',
      'o3-mini': 'Fast reasoning model',
    };

    // Check for exact match first
    if (descriptionMap[modelId]) {
      return descriptionMap[modelId];
    }

    // Check for prefix matches
    const lowerModel = modelId.toLowerCase();
    if (lowerModel.startsWith('gpt-4o-mini')) return 'GPT-4o Mini variant';
    if (lowerModel.startsWith('gpt-4o')) return 'GPT-4o variant';
    if (lowerModel.startsWith('gpt-4-turbo')) return 'GPT-4 Turbo variant';
    if (lowerModel.startsWith('gpt-4')) return 'GPT-4 variant';
    if (lowerModel.startsWith('gpt-3.5')) return 'GPT-3.5 variant';
    if (lowerModel.startsWith('o1')) return 'Reasoning model';
    if (lowerModel.startsWith('o3')) return 'Reasoning model';

    // Generic fallback for future GPT versions (gpt-5, gpt-6, etc.)
    if (lowerModel.startsWith('gpt-')) return 'OpenAI GPT model';

    return 'OpenAI model';
  }

  /**
   * Get description for embedding models
   */
  private getEmbeddingModelDescription(modelId: string): string {
    const descriptionMap: Record<string, string> = {
      'text-embedding-3-small': 'Newest, most efficient (1536 dimensions)',
      'text-embedding-3-large': 'Best quality (3072 dimensions)',
      'text-embedding-ada-002': 'Legacy model (1536 dimensions)',
    };

    return descriptionMap[modelId] || 'Embedding model';
  }

  /**
   * Clear cache (force refresh on next request)
   */
  clearCache(): void {
    this.chatModelsCache.clear();
    this.embeddingModelsCache.clear();
    this.logger.debug('OpenAI model caches cleared');
  }

  /**
   * Get default/fallback chat models when API is unavailable
   */
  getDefaultChatModels(): OpenAIModel[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable model, multimodal (text + vision)',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable, great for most tasks',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High capability with vision support',
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Original GPT-4, high capability',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective',
      },
      {
        id: 'o1-preview',
        name: 'o1 Preview',
        description: 'Advanced reasoning for complex problems',
      },
      {
        id: 'o1-mini',
        name: 'o1 Mini',
        description: 'Efficient reasoning model',
      },
    ];
  }

  /**
   * Get default/fallback embedding models when API is unavailable
   */
  getDefaultEmbeddingModels(): OpenAIModel[] {
    return [
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        description: 'Newest, most efficient (1536 dimensions)',
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        description: 'Best quality (3072 dimensions)',
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002',
        description: 'Legacy model (1536 dimensions)',
      },
    ];
  }
}
