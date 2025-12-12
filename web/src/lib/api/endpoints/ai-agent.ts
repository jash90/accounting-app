import apiClient from '../client';
import { tokenStorage } from '@/lib/auth/token-storage';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationResponseDto,
  AIMessageDto,
  CreateAIConfigurationDto,
  UpdateAIConfigurationDto,
  AIConfigurationResponseDto,
  TokenUsageResponseDto,
  TokenUsageSummaryDto,
  CompanyTokenUsageDto,
  AIContextResponseDto,
  SetTokenLimitDto,
  TokenLimitResponseDto,
  OpenRouterModelDto,
  OpenAIModelDto,
  ChatStreamChunk,
} from '@/types/dtos';

// Conversation endpoints
export const conversationApi = {
  getAll: async (): Promise<ConversationResponseDto[]> => {
    const { data } = await apiClient.get<{ data: ConversationResponseDto[] } | ConversationResponseDto[]>('/api/modules/ai-agent/conversations');
    // Handle both paginated response ({ data: [...] }) and array response
    return Array.isArray(data) ? data : data.data;
  },

  getById: async (id: string): Promise<ConversationResponseDto> => {
    const { data } = await apiClient.get<ConversationResponseDto>(`/api/modules/ai-agent/conversations/${id}`);
    return data;
  },

  create: async (conversationData: CreateConversationDto): Promise<ConversationResponseDto> => {
    const { data } = await apiClient.post<ConversationResponseDto>('/api/modules/ai-agent/conversations', conversationData);
    return data;
  },

  sendMessage: async (conversationId: string, messageData: SendMessageDto): Promise<{ userMessage: { content: string }, assistantMessage: AIMessageDto }> => {
    const { data } = await apiClient.post<{ userMessage: { content: string }, assistantMessage: AIMessageDto }>(
      `/api/modules/ai-agent/conversations/${conversationId}/messages`,
      messageData
    );
    return data;
  },

  /**
   * Send message with streaming response via SSE.
   * Uses fetch with ReadableStream for POST+SSE support.
   */
  sendMessageStream: async (
    conversationId: string,
    messageData: SendMessageDto,
    onChunk: (content: string) => void,
    onDone?: (data: { inputTokens?: number; outputTokens?: number; totalTokens?: number }) => void,
    onError?: (error: string) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = tokenStorage.getAccessToken();

    if (!token) {
      throw new Error('No access token available. Please log in again.');
    }

    const response = await fetch(`/api/modules/ai-agent/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(messageData),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Stream request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === '') continue;

          // Handle SSE data lines
          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data) as ChatStreamChunk;

              if (parsed.type === 'content' && parsed.content) {
                onChunk(parsed.content);
              } else if (parsed.type === 'done') {
                onDone?.({
                  inputTokens: parsed.inputTokens,
                  outputTokens: parsed.outputTokens,
                  totalTokens: parsed.totalTokens,
                });
              } else if (parsed.type === 'error') {
                onError?.(parsed.error || 'Unknown streaming error');
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/modules/ai-agent/conversations/${id}`);
  },
};

// AI Configuration endpoints
export const aiConfigurationApi = {
  get: async (): Promise<AIConfigurationResponseDto | null> => {
    const { data } = await apiClient.get<AIConfigurationResponseDto | null>('/api/modules/ai-agent/config');
    return data;
  },

  create: async (configData: CreateAIConfigurationDto): Promise<AIConfigurationResponseDto> => {
    const { data } = await apiClient.post<AIConfigurationResponseDto>('/api/modules/ai-agent/config', configData);
    return data;
  },

  update: async (configData: UpdateAIConfigurationDto): Promise<AIConfigurationResponseDto> => {
    const { data } = await apiClient.patch<AIConfigurationResponseDto>('/api/modules/ai-agent/config', configData);
    return data;
  },

  getModels: async (): Promise<OpenRouterModelDto[]> => {
    const { data } = await apiClient.get<OpenRouterModelDto[]>('/api/modules/ai-agent/config/models');
    return data;
  },

  getOpenAIModels: async (): Promise<OpenAIModelDto[]> => {
    const { data } = await apiClient.get<OpenAIModelDto[]>('/api/modules/ai-agent/config/openai-models');
    return data;
  },

  getOpenAIEmbeddingModels: async (): Promise<OpenAIModelDto[]> => {
    const { data } = await apiClient.get<OpenAIModelDto[]>('/api/modules/ai-agent/config/openai-embedding-models');
    return data;
  },

  resetApiKey: async (): Promise<AIConfigurationResponseDto> => {
    const { data } = await apiClient.post<AIConfigurationResponseDto>('/api/modules/ai-agent/config/reset-api-key');
    return data;
  },
};

// Token Usage endpoints
export const tokenUsageApi = {
  getMySummary: async (): Promise<TokenUsageSummaryDto> => {
    const { data } = await apiClient.get<TokenUsageSummaryDto>('/api/modules/ai-agent/usage/me');
    return data;
  },

  getMyUsage: async (): Promise<TokenUsageResponseDto[]> => {
    const { data } = await apiClient.get<TokenUsageResponseDto[]>('/api/modules/ai-agent/usage/me/detailed');
    return data;
  },

  // For COMPANY_OWNER - get company-wide usage
  getCompanyUsage: async (): Promise<CompanyTokenUsageDto> => {
    const { data } = await apiClient.get<CompanyTokenUsageDto>('/api/modules/ai-agent/usage/company');
    return data;
  },

  // For ADMIN - get all companies usage
  getAllCompaniesUsage: async (): Promise<CompanyTokenUsageDto[]> => {
    const { data } = await apiClient.get<CompanyTokenUsageDto[]>('/api/modules/ai-agent/usage/all-companies');
    return data;
  },

  // Get usage by company (ADMIN only)
  getCompanyUsageById: async (companyId: string): Promise<CompanyTokenUsageDto> => {
    const { data } = await apiClient.get<CompanyTokenUsageDto>(`/api/modules/ai-agent/usage/company/${companyId}`);
    return data;
  },
};

// Token Limit endpoints
export const tokenLimitApi = {
  get: async (targetType: 'company' | 'user', targetId: string): Promise<TokenLimitResponseDto> => {
    const { data } = await apiClient.get<TokenLimitResponseDto>(`/api/modules/ai-agent/token-limit/${targetType}/${targetId}`);
    return data;
  },

  set: async (limitData: SetTokenLimitDto): Promise<TokenLimitResponseDto> => {
    const { data } = await apiClient.post<TokenLimitResponseDto>('/api/modules/ai-agent/token-limit', limitData);
    return data;
  },

  delete: async (targetType: 'company' | 'user', targetId: string): Promise<void> => {
    await apiClient.delete(`/api/modules/ai-agent/token-limit/${targetType}/${targetId}`);
  },
};

// Context/RAG endpoints
export const contextApi = {
  getAll: async (): Promise<AIContextResponseDto[]> => {
    const { data } = await apiClient.get<AIContextResponseDto[]>('/api/modules/ai-agent/context');
    return data;
  },

  getOne: async (id: string): Promise<AIContextResponseDto & { extractedText: string }> => {
    const { data } = await apiClient.get<AIContextResponseDto & { extractedText: string }>(`/api/modules/ai-agent/context/${id}`);
    return data;
  },

  upload: async (file: File): Promise<AIContextResponseDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<AIContextResponseDto>('/api/modules/ai-agent/context', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/modules/ai-agent/context/${id}`);
  },
};

// Combined export
export const aiAgentApi = {
  conversations: conversationApi,
  configuration: aiConfigurationApi,
  tokenUsage: tokenUsageApi,
  tokenLimit: tokenLimitApi,
  context: contextApi,
};
