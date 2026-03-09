import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAIConfiguration,
  useAiContextFile,
  useAiContextFiles,
  useAiConversation,
  useAiConversations,
  useAiTokenLimit,
  useAllCompaniesTokenUsage,
  useCompanyTokenUsage,
  useCompanyTokenUsageById,
  useCreateAIConfiguration,
  useCreateAiConversation,
  useDeleteAiContextFile,
  useDeleteAiConversation,
  useDeleteAiTokenLimit,
  useMyTokenUsageDetailed,
  useMyTokenUsageSummary,
  useOpenAIEmbeddingModels,
  useOpenAIModels,
  useOpenRouterModels,
  useResetAiApiKey,
  useSendAiMessage,
  useSetAiTokenLimit,
  useUpdateAIConfiguration,
  useUploadAiContextFile,
} from './use-ai-agent';
import { aiAgentApi } from '../api/endpoints/ai-agent';

// Mock the API modules
vi.mock('../api/endpoints/ai-agent');
vi.mock('sonner');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockConversation = {
  id: 'conv-123',
  title: 'Test conversation',
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z',
  messages: [],
};

const mockConfig = {
  id: 'config-123',
  provider: 'openrouter',
  model: 'gpt-4',
  isConfigured: true,
};

const mockTokenUsageSummary = {
  totalInputTokens: 1000,
  totalOutputTokens: 500,
  totalTokens: 1500,
};

const mockTokenUsageDetailed = [
  { id: 'usage-1', inputTokens: 500, outputTokens: 250, createdAt: '2024-01-15T09:00:00Z' },
];

const mockCompanyUsage = {
  companyId: 'company-123',
  totalInputTokens: 5000,
  totalOutputTokens: 2500,
  users: [],
};

const mockTokenLimit = {
  id: 'limit-123',
  targetType: 'company' as const,
  targetId: 'company-123',
  monthlyLimit: 100000,
};

const mockContextFile = {
  id: 'ctx-123',
  filename: 'test.pdf',
  fileSize: 1024,
  status: 'processed',
  createdAt: '2024-01-15T09:00:00Z',
};

const mockModel = { id: 'model-1', name: 'GPT-4' };

describe('use-ai-agent hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Conversation Query Hooks
  // ========================================

  describe('useAiConversations', () => {
    it('should fetch all conversations', async () => {
      vi.mocked(aiAgentApi.conversations.getAll).mockResolvedValue([mockConversation]);

      const { result } = renderHook(() => useAiConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockConversation]);
      expect(aiAgentApi.conversations.getAll).toHaveBeenCalled();
    });

    it('should return empty array when no conversations exist', async () => {
      vi.mocked(aiAgentApi.conversations.getAll).mockResolvedValue([]);

      const { result } = renderHook(() => useAiConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAiConversation', () => {
    it('should fetch single conversation by id', async () => {
      vi.mocked(aiAgentApi.conversations.getById).mockResolvedValue(mockConversation);

      const { result } = renderHook(() => useAiConversation('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConversation);
      expect(aiAgentApi.conversations.getById).toHaveBeenCalledWith('conv-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useAiConversation(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(aiAgentApi.conversations.getById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Conversation Mutation Hooks
  // ========================================

  describe('useCreateAiConversation', () => {
    it('should create conversation and show success toast', async () => {
      vi.mocked(aiAgentApi.conversations.create).mockResolvedValue(mockConversation);

      const { result } = renderHook(() => useCreateAiConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New conversation' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.conversations.create).toHaveBeenCalledWith({ title: 'New conversation' });
      expect(toast.success).toHaveBeenCalledWith('Konwersacja została utworzona');
    });

    it('should show error toast on failure', async () => {
      vi.mocked(aiAgentApi.conversations.create).mockRejectedValue({
        response: { data: { message: 'Creation failed' } },
      });

      const { result } = renderHook(() => useCreateAiConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New conversation' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('useSendAiMessage', () => {
    it('should send message to conversation', async () => {
      vi.mocked(aiAgentApi.conversations.sendMessage).mockResolvedValue({} as any);

      const { result } = renderHook(() => useSendAiMessage('conv-123'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ content: 'Hello AI' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.conversations.sendMessage).toHaveBeenCalledWith('conv-123', {
        content: 'Hello AI',
      });
    });

    it('should show error toast on send failure', async () => {
      vi.mocked(aiAgentApi.conversations.sendMessage).mockRejectedValue({
        response: { data: { message: 'Send failed' } },
      });

      const { result } = renderHook(() => useSendAiMessage('conv-123'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ content: 'Hello AI' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('useDeleteAiConversation', () => {
    it('should delete conversation and show success toast', async () => {
      vi.mocked(aiAgentApi.conversations.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAiConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('conv-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.conversations.delete).toHaveBeenCalledWith('conv-123');
      expect(toast.success).toHaveBeenCalledWith('Konwersacja została usunięta');
    });

    it('should show error toast on delete failure', async () => {
      vi.mocked(aiAgentApi.conversations.delete).mockRejectedValue({
        response: { data: { message: 'Delete failed' } },
      });

      const { result } = renderHook(() => useDeleteAiConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('conv-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ========================================
  // AI Configuration Hooks
  // ========================================

  describe('useAIConfiguration', () => {
    it('should fetch AI configuration', async () => {
      vi.mocked(aiAgentApi.configuration.get).mockResolvedValue(mockConfig as any);

      const { result } = renderHook(() => useAIConfiguration(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConfig);
      expect(aiAgentApi.configuration.get).toHaveBeenCalled();
    });

    it('should handle no configuration gracefully', async () => {
      vi.mocked(aiAgentApi.configuration.get).mockResolvedValue(null);

      const { result } = renderHook(() => useAIConfiguration(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useCreateAIConfiguration', () => {
    it('should create AI configuration and show success toast', async () => {
      vi.mocked(aiAgentApi.configuration.create).mockResolvedValue(mockConfig as any);

      const { result } = renderHook(() => useCreateAIConfiguration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ provider: 'openrouter', apiKey: 'test-key' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Konfiguracja AI została utworzona');
    });
  });

  describe('useUpdateAIConfiguration', () => {
    it('should update AI configuration and show success toast', async () => {
      vi.mocked(aiAgentApi.configuration.update).mockResolvedValue(mockConfig as any);

      const { result } = renderHook(() => useUpdateAIConfiguration(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ model: 'gpt-4o' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Konfiguracja AI została zaktualizowana');
    });
  });

  describe('useOpenRouterModels', () => {
    it('should fetch OpenRouter models', async () => {
      vi.mocked(aiAgentApi.configuration.getModels).mockResolvedValue([mockModel] as any);

      const { result } = renderHook(() => useOpenRouterModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockModel]);
    });
  });

  describe('useOpenAIModels', () => {
    it('should fetch OpenAI models', async () => {
      vi.mocked(aiAgentApi.configuration.getOpenAIModels).mockResolvedValue([mockModel] as any);

      const { result } = renderHook(() => useOpenAIModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockModel]);
    });
  });

  describe('useOpenAIEmbeddingModels', () => {
    it('should fetch OpenAI embedding models', async () => {
      vi.mocked(aiAgentApi.configuration.getOpenAIEmbeddingModels).mockResolvedValue([
        mockModel,
      ] as any);

      const { result } = renderHook(() => useOpenAIEmbeddingModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockModel]);
    });
  });

  describe('useResetAiApiKey', () => {
    it('should reset API key and show success toast', async () => {
      vi.mocked(aiAgentApi.configuration.resetApiKey).mockResolvedValue(mockConfig as any);

      const { result } = renderHook(() => useResetAiApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.configuration.resetApiKey).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });

    it('should show error toast on reset failure', async () => {
      vi.mocked(aiAgentApi.configuration.resetApiKey).mockRejectedValue({
        response: { data: { message: 'Reset failed' } },
      });

      const { result } = renderHook(() => useResetAiApiKey(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ========================================
  // Token Usage Hooks
  // ========================================

  describe('useMyTokenUsageSummary', () => {
    it('should fetch my token usage summary', async () => {
      vi.mocked(aiAgentApi.tokenUsage.getMySummary).mockResolvedValue(mockTokenUsageSummary as any);

      const { result } = renderHook(() => useMyTokenUsageSummary(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTokenUsageSummary);
    });
  });

  describe('useMyTokenUsageDetailed', () => {
    it('should fetch my detailed token usage', async () => {
      vi.mocked(aiAgentApi.tokenUsage.getMyUsage).mockResolvedValue(mockTokenUsageDetailed as any);

      const { result } = renderHook(() => useMyTokenUsageDetailed(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTokenUsageDetailed);
    });
  });

  describe('useCompanyTokenUsage', () => {
    it('should fetch company token usage', async () => {
      vi.mocked(aiAgentApi.tokenUsage.getCompanyUsage).mockResolvedValue(mockCompanyUsage as any);

      const { result } = renderHook(() => useCompanyTokenUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCompanyUsage);
    });
  });

  describe('useAllCompaniesTokenUsage', () => {
    it('should fetch all companies token usage', async () => {
      vi.mocked(aiAgentApi.tokenUsage.getAllCompaniesUsage).mockResolvedValue([
        mockCompanyUsage,
      ] as any);

      const { result } = renderHook(() => useAllCompaniesTokenUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockCompanyUsage]);
    });
  });

  describe('useCompanyTokenUsageById', () => {
    it('should fetch company token usage by id', async () => {
      vi.mocked(aiAgentApi.tokenUsage.getCompanyUsageById).mockResolvedValue(
        mockCompanyUsage as any
      );

      const { result } = renderHook(() => useCompanyTokenUsageById('company-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCompanyUsage);
      expect(aiAgentApi.tokenUsage.getCompanyUsageById).toHaveBeenCalledWith('company-123');
    });

    it('should not fetch when companyId is empty', async () => {
      const { result } = renderHook(() => useCompanyTokenUsageById(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(aiAgentApi.tokenUsage.getCompanyUsageById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Token Limit Hooks
  // ========================================

  describe('useAiTokenLimit', () => {
    it('should fetch token limit for target', async () => {
      vi.mocked(aiAgentApi.tokenLimit.get).mockResolvedValue(mockTokenLimit as any);

      const { result } = renderHook(() => useAiTokenLimit('company', 'company-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTokenLimit);
      expect(aiAgentApi.tokenLimit.get).toHaveBeenCalledWith('company', 'company-123');
    });

    it('should not fetch when targetId is empty', async () => {
      const { result } = renderHook(() => useAiTokenLimit('company', ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(aiAgentApi.tokenLimit.get).not.toHaveBeenCalled();
    });
  });

  describe('useSetAiTokenLimit', () => {
    it('should set token limit and show success toast', async () => {
      vi.mocked(aiAgentApi.tokenLimit.set).mockResolvedValue(mockTokenLimit as any);

      const { result } = renderHook(() => useSetAiTokenLimit(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          targetType: 'company',
          targetId: 'company-123',
          monthlyLimit: 100000,
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Limit tokenów został ustawiony');
    });
  });

  describe('useDeleteAiTokenLimit', () => {
    it('should delete token limit and show success toast', async () => {
      vi.mocked(aiAgentApi.tokenLimit.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAiTokenLimit(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ targetType: 'company', targetId: 'company-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.tokenLimit.delete).toHaveBeenCalledWith('company', 'company-123');
      expect(toast.success).toHaveBeenCalledWith('Limit tokenów został usunięty');
    });
  });

  // ========================================
  // Context/RAG Hooks
  // ========================================

  describe('useAiContextFiles', () => {
    it('should fetch all context files', async () => {
      vi.mocked(aiAgentApi.context.getAll).mockResolvedValue([mockContextFile] as any);

      const { result } = renderHook(() => useAiContextFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockContextFile]);
    });
  });

  describe('useAiContextFile', () => {
    it('should fetch single context file', async () => {
      vi.mocked(aiAgentApi.context.getOne).mockResolvedValue({
        ...mockContextFile,
        extractedText: 'Some text',
      } as any);

      const { result } = renderHook(() => useAiContextFile('ctx-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.context.getOne).toHaveBeenCalledWith('ctx-123');
    });

    it('should not fetch when id is null', async () => {
      const { result } = renderHook(() => useAiContextFile(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(aiAgentApi.context.getOne).not.toHaveBeenCalled();
    });
  });

  describe('useUploadAiContextFile', () => {
    it('should upload context file and show success toast', async () => {
      vi.mocked(aiAgentApi.context.upload).mockResolvedValue(mockContextFile as any);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const { result } = renderHook(() => useUploadAiContextFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.context.upload).toHaveBeenCalledWith(file);
      expect(toast.success).toHaveBeenCalledWith('Plik został przesłany i przetworzony');
    });

    it('should show specific error for API key issues', async () => {
      vi.mocked(aiAgentApi.context.upload).mockRejectedValue({
        response: { data: { message: 'Invalid API key' } },
      });
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const { result } = renderHook(() => useUploadAiContextFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('klucz API'));
    });

    it('should show specific error for file too large', async () => {
      vi.mocked(aiAgentApi.context.upload).mockRejectedValue({
        response: { status: 413, data: { message: 'File too large' } },
      });
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const { result } = renderHook(() => useUploadAiContextFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('za duży'));
    });
  });

  describe('useDeleteAiContextFile', () => {
    it('should delete context file and show success toast', async () => {
      vi.mocked(aiAgentApi.context.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAiContextFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('ctx-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(aiAgentApi.context.delete).toHaveBeenCalledWith('ctx-123');
      expect(toast.success).toHaveBeenCalledWith('Plik został usunięty');
    });

    it('should show error toast on delete failure', async () => {
      vi.mocked(aiAgentApi.context.delete).mockRejectedValue({
        response: { data: { message: 'Delete failed' } },
      });

      const { result } = renderHook(() => useDeleteAiContextFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('ctx-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });
});
