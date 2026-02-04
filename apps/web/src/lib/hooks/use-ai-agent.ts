import { useCallback, useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type ApiErrorResponse } from '@/types/api';
import {
  type CreateAIConfigurationDto,
  type CreateConversationDto,
  type SendMessageDto,
  type SetTokenLimitDto,
  type UpdateAIConfigurationDto,
} from '@/types/dtos';

import { aiAgentApi } from '../api/endpoints/ai-agent';
import { queryKeys } from '../api/query-client';

// ============================================
// Cache Time Constants
// ============================================

/** Cache times for conversation list - conversations can change frequently */
const CONVERSATION_LIST_CACHE = {
  staleTime: 30 * 1000, // 30 seconds - refetch on focus after 30s
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for conversation detail - needs real-time updates during active chat */
const CONVERSATION_DETAIL_CACHE = {
  staleTime: 5 * 1000, // 5 seconds - balance freshness with avoiding constant refetches
  gcTime: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// Conversation Hooks
// ============================================================================

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.aiAgent.conversations.all,
    queryFn: aiAgentApi.conversations.getAll,
    ...CONVERSATION_LIST_CACHE,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.aiAgent.conversations.detail(id),
    queryFn: () => aiAgentApi.conversations.getById(id),
    enabled: !!id,
    ...CONVERSATION_DETAIL_CACHE,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationDto) => aiAgentApi.conversations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.all });
      toast.success('Konwersacja została utworzona');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się utworzyć konwersacji');
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageDto) =>
      aiAgentApi.conversations.sendMessage(conversationId, data),
    onSuccess: () => {
      // Invalidate both conversation detail and token usage
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiAgent.conversations.detail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.myDetailed });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.company });
    },
    onError: (error: ApiErrorResponse) => {
      const message = error.response?.data?.message || 'Nie udało się wysłać wiadomości';
      toast.error(message);
    },
  });
}

/**
 * Hook for sending messages with streaming response.
 * Provides real-time content updates as the AI generates its response.
 */
/** Maximum streaming content size (100KB) to prevent memory issues on large responses */
const MAX_STREAM_SIZE = 100_000;

export function useSendMessageStream(conversationId: string) {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store queryClient in ref to avoid it being a dependency of the sendMessage callback.
  // Why this pattern is necessary:
  // 1. queryClient from useQueryClient() is a stable singleton - it never changes during the app lifecycle
  // 2. However, ESLint's exhaustive-deps rule doesn't understand this stability
  // 3. Adding queryClient to sendMessage's dependency array would cause unnecessary recreations
  // 4. Using a ref allows the callback to always access the current queryClient without being a dependency
  // 5. The useEffect ensures the ref stays synchronized (defensive coding, though queryClient never actually changes)
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) {
        toast.error('Nie wybrano konwersacji');
        return;
      }

      setIsStreaming(true);
      setStreamingContent('');
      abortControllerRef.current = new AbortController();

      try {
        await aiAgentApi.conversations.sendMessageStream(
          conversationId,
          { content },
          // onChunk - called for each content piece
          // Includes size limit to prevent memory issues on large responses
          (chunk) => {
            setStreamingContent((prev) => {
              const next = prev + chunk;
              // Cap content size to prevent memory issues
              if (next.length > MAX_STREAM_SIZE) {
                toast.warning('Odpowiedź została obcięta - przekroczono limit 100KB');
                return next.slice(-MAX_STREAM_SIZE);
              }
              return next;
            });
          },
          // onDone - called when streaming completes
          () => {
            setIsStreaming(false);
            // Invalidate queries to refresh data with final message
            // Use ref to avoid queryClient being a callback dependency
            queryClientRef.current.invalidateQueries({
              queryKey: queryKeys.aiAgent.conversations.detail(conversationId),
            });
            queryClientRef.current.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.me });
            queryClientRef.current.invalidateQueries({
              queryKey: queryKeys.aiAgent.tokenUsage.myDetailed,
            });
            queryClientRef.current.invalidateQueries({
              queryKey: queryKeys.aiAgent.tokenUsage.company,
            });
          },
          // onError - called if streaming fails
          (error) => {
            setIsStreaming(false);
            toast.error(error);
          },
          // signal - for cancellation
          abortControllerRef.current?.signal
        );
      } catch (error: unknown) {
        setIsStreaming(false);
        const message = error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości';
        toast.error(message);
      }
    },
    [conversationId]
  );

  const cancelStream = useCallback(() => {
    try {
      abortControllerRef.current?.abort();
    } catch {
      // AbortController.abort() can throw in edge cases (e.g., already aborted)
      // Silently ignore as the intent is to stop streaming regardless
    }
    setIsStreaming(false);
    setStreamingContent(''); // Clear content on cancel to free memory
  }, []);

  const resetStream = useCallback(() => {
    setStreamingContent('');
    setIsStreaming(false);
  }, []);

  return {
    sendMessage,
    streamingContent,
    isStreaming,
    cancelStream,
    resetStream,
  };
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAgentApi.conversations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.all });
      toast.success('Konwersacja została usunięta');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się usunąć konwersacji');
    },
  });
}

// ============================================================================
// AI Configuration Hooks
// ============================================================================

export function useAIConfiguration() {
  return useQuery({
    queryKey: queryKeys.aiAgent.configuration,
    queryFn: aiAgentApi.configuration.get,
    retry: false, // Don't retry if no configuration exists
    staleTime: 5 * 60 * 1000, // 5 minutes - configuration changes infrequently
  });
}

export function useCreateAIConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAIConfigurationDto) => aiAgentApi.configuration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      toast.success('Konfiguracja AI została utworzona');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się utworzyć konfiguracji AI');
    },
  });
}

export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAIConfigurationDto) => aiAgentApi.configuration.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      toast.success('Konfiguracja AI została zaktualizowana');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się zaktualizować konfiguracji AI');
    },
  });
}

export function useOpenRouterModels() {
  return useQuery({
    queryKey: queryKeys.aiAgent.models,
    queryFn: aiAgentApi.configuration.getModels,
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

export function useOpenAIModels() {
  return useQuery({
    queryKey: queryKeys.aiAgent.openaiModels,
    queryFn: aiAgentApi.configuration.getOpenAIModels,
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

export function useOpenAIEmbeddingModels() {
  return useQuery({
    queryKey: queryKeys.aiAgent.openaiEmbeddingModels,
    queryFn: aiAgentApi.configuration.getOpenAIEmbeddingModels,
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

export function useResetApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiAgentApi.configuration.resetApiKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      toast.success(
        'Klucz API został zresetowany. Skonfiguruj nowy klucz API, aby korzystać z funkcji AI.'
      );
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się zresetować klucza API');
    },
  });
}

// ============================================================================
// Token Usage Hooks
// ============================================================================

export function useMyTokenUsageSummary() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.me,
    queryFn: aiAgentApi.tokenUsage.getMySummary,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMyTokenUsageDetailed() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.myDetailed,
    queryFn: aiAgentApi.tokenUsage.getMyUsage,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCompanyTokenUsage() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.company,
    queryFn: aiAgentApi.tokenUsage.getCompanyUsage,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAllCompaniesTokenUsage() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.allCompanies,
    queryFn: aiAgentApi.tokenUsage.getAllCompaniesUsage,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCompanyTokenUsageById(companyId: string) {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.companyById(companyId),
    queryFn: () => aiAgentApi.tokenUsage.getCompanyUsageById(companyId),
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// Token Limit Hooks
// ============================================================================

export function useTokenLimit(targetType: 'company' | 'user', targetId: string) {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenLimit.byTarget(targetType, targetId),
    queryFn: () => aiAgentApi.tokenLimit.get(targetType, targetId),
    enabled: !!targetId,
    retry: false, // Don't retry if no limit exists
    staleTime: 5 * 60 * 1000, // 5 minutes - limits change infrequently
  });
}

export function useSetTokenLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetTokenLimitDto) => aiAgentApi.tokenLimit.set(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiAgent.tokenLimit.byTarget(variables.targetType, variables.targetId),
      });
      toast.success('Limit tokenów został ustawiony');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się ustawić limitu tokenów');
    },
  });
}

export function useDeleteTokenLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetType, targetId }: { targetType: 'company' | 'user'; targetId: string }) =>
      aiAgentApi.tokenLimit.delete(targetType, targetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiAgent.tokenLimit.byTarget(variables.targetType, variables.targetId),
      });
      toast.success('Limit tokenów został usunięty');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się usunąć limitu tokenów');
    },
  });
}

// ============================================================================
// Context/RAG Hooks
// ============================================================================

export function useContextFiles() {
  return useQuery({
    queryKey: queryKeys.aiAgent.context.all,
    queryFn: aiAgentApi.context.getAll,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useContextFile(id: string | null) {
  return useQuery({
    queryKey: queryKeys.aiAgent.context.detail(id!),
    queryFn: () => aiAgentApi.context.getOne(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUploadContextFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => aiAgentApi.context.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.context.all });
      toast.success('Plik został przesłany i przetworzony');
    },
    onError: (error: ApiErrorResponse) => {
      const message = error.response?.data?.message || 'Nie udało się przesłać pliku';
      const status = error.response?.status;

      // Provide more helpful error messages for common issues
      if (message.toLowerCase().includes('api key')) {
        toast.error(
          'Błąd konfiguracji AI: Nieprawidłowy klucz API. Skontaktuj się z administratorem, aby zaktualizować konfigurację AI.'
        );
      } else if (status === 413 || message.toLowerCase().includes('too large')) {
        toast.error('Plik jest za duży. Maksymalny rozmiar pliku to 10MB.');
      } else if (
        message.toLowerCase().includes('file type') ||
        message.toLowerCase().includes('not allowed')
      ) {
        toast.error('Nieprawidłowy typ pliku. Dozwolone są tylko pliki PDF, TXT i MD.');
      } else if (
        message.toLowerCase().includes('not found') &&
        message.toLowerCase().includes('configuration')
      ) {
        toast.error('AI nie jest skonfigurowane. Poproś administratora o skonfigurowanie AI.');
      } else {
        toast.error(message);
      }
    },
  });
}

export function useDeleteContextFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiAgentApi.context.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.context.all });
      toast.success('Plik został usunięty');
    },
    onError: (error: ApiErrorResponse) => {
      toast.error(error.response?.data?.message || 'Nie udało się usunąć pliku');
    },
  });
}
