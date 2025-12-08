import apiClient from '../client';
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
