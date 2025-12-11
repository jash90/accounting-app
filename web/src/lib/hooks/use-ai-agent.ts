import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { aiAgentApi } from '../api/endpoints/ai-agent';
import { queryKeys } from '../api/query-client';
import {
  CreateConversationDto,
  SendMessageDto,
  CreateAIConfigurationDto,
  UpdateAIConfigurationDto,
  SetTokenLimitDto,
} from '@/types/dtos';
import { toast } from 'sonner';

// ============================================================================
// Conversation Hooks
// ============================================================================

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.aiAgent.conversations.all,
    queryFn: aiAgentApi.conversations.getAll,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.aiAgent.conversations.detail(id),
    queryFn: () => aiAgentApi.conversations.getById(id),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationDto) => aiAgentApi.conversations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.all });
      toast.success('Conversation created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create conversation');
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageDto) => aiAgentApi.conversations.sendMessage(conversationId, data),
    onSuccess: () => {
      // Invalidate both conversation detail and token usage
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.myDetailed });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.company });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to send message';
      toast.error(message);
    },
  });
}

/**
 * Hook for sending messages with streaming response.
 * Provides real-time content updates as the AI generates its response.
 */
export function useSendMessageStream(conversationId: string) {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) {
      toast.error('No conversation selected');
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
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        // onDone - called when streaming completes
        () => {
          setIsStreaming(false);
          // Invalidate queries to refresh data with final message
          queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.detail(conversationId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.me });
          queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.myDetailed });
          queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.tokenUsage.company });
        },
        // onError - called if streaming fails
        (error) => {
          setIsStreaming(false);
          toast.error(error);
        },
      );
    } catch (error: any) {
      setIsStreaming(false);
      const message = error.message || 'Failed to send message';
      toast.error(message);
    }
  }, [conversationId, queryClient]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
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
      toast.success('Conversation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete conversation');
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
  });
}

export function useCreateAIConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAIConfigurationDto) => aiAgentApi.configuration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      toast.success('AI configuration created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create AI configuration');
    },
  });
}

export function useUpdateAIConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAIConfigurationDto) => aiAgentApi.configuration.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      toast.success('AI configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update AI configuration');
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
      toast.success('API key has been reset. Please configure a new API key to use AI features.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset API key');
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
  });
}

export function useMyTokenUsageDetailed() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.myDetailed,
    queryFn: aiAgentApi.tokenUsage.getMyUsage,
  });
}

export function useCompanyTokenUsage() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.company,
    queryFn: aiAgentApi.tokenUsage.getCompanyUsage,
  });
}

export function useAllCompaniesTokenUsage() {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.allCompanies,
    queryFn: aiAgentApi.tokenUsage.getAllCompaniesUsage,
  });
}

export function useCompanyTokenUsageById(companyId: string) {
  return useQuery({
    queryKey: queryKeys.aiAgent.tokenUsage.companyById(companyId),
    queryFn: () => aiAgentApi.tokenUsage.getCompanyUsageById(companyId),
    enabled: !!companyId,
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
      toast.success('Token limit set successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to set token limit');
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
      toast.success('Token limit removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove token limit');
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
  });
}

export function useContextFile(id: string | null) {
  return useQuery({
    queryKey: queryKeys.aiAgent.context.detail(id!),
    queryFn: () => aiAgentApi.context.getOne(id!),
    enabled: !!id,
  });
}

export function useUploadContextFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => aiAgentApi.context.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.context.all });
      toast.success('File uploaded and processed successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to upload file';
      const status = error.response?.status;

      // Provide more helpful error messages for common issues
      if (message.toLowerCase().includes('api key')) {
        toast.error('AI Configuration Error: Invalid API key. Please contact administrator to update the AI configuration.');
      } else if (status === 413 || message.toLowerCase().includes('too large')) {
        toast.error('File too large. Maximum file size is 10MB.');
      } else if (message.toLowerCase().includes('file type') || message.toLowerCase().includes('not allowed')) {
        toast.error('Invalid file type. Only PDF, TXT, and MD files are allowed.');
      } else if (message.toLowerCase().includes('not found') && message.toLowerCase().includes('configuration')) {
        toast.error('AI not configured. Please ask administrator to set up AI configuration first.');
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
      toast.success('File deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete file');
    },
  });
}
