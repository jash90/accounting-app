import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { tokenStorage } from '../auth/token-storage';

interface EmailAddress {
  address: string;
  name?: string;
}

interface EmailAttachment {
  filename?: string;
  size?: number;
  contentType?: string;
}

interface Email {
  uid: number;
  seqno: number;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  text: string;
  html?: string;
  flags: string[];
  attachments?: EmailAttachment[];
}

interface Draft {
  id: string;
  to: string[];
  cc?: string[];
  subject?: string;
  textContent: string;
  htmlContent?: string;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function useInbox(limit = 50, unseenOnly = false) {
  return useQuery({
    queryKey: ['email-inbox', limit, unseenOnly],
    queryFn: async () => {
      const { data } = await apiClient.get<Email[]>('/api/modules/email-client/messages/inbox', {
        params: { limit, unseenOnly },
      });
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}

export function useDrafts() {
  return useQuery({
    queryKey: ['email-drafts'],
    queryFn: async () => {
      const { data } = await apiClient.get<Draft[]>('/api/modules/email-client/drafts/my');
      return data;
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailData: {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
    }) => {
      const { data } = await apiClient.post('/api/modules/email-client/messages/send', emailData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
    },
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftData: {
      to: string[];
      subject?: string;
      textContent: string;
    }) => {
      const { data} = await apiClient.post<Draft>('/api/modules/email-client/drafts', draftData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

export function useSendDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { data } = await apiClient.post(`/api/modules/email-client/drafts/${draftId}/send`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
    },
  });
}

/**
 * Fetch single email by UID
 * Uses initialData from inbox cache for instant display when navigating from inbox
 */
export function useEmail(uid: number | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['email', uid],
    queryFn: async () => {
      const { data } = await apiClient.get<Email>(`/api/modules/email-client/messages/${uid}`);
      return data;
    },
    enabled: !!uid,
    initialData: () => {
      if (!uid) return undefined;
      // Try to get email from inbox cache (check both with and without filters)
      const inboxData = queryClient.getQueryData<Email[]>(['email-inbox', 50, false]);
      if (inboxData) {
        const cachedEmail = inboxData.find((email) => email.uid === uid);
        if (cachedEmail) return cachedEmail;
      }
      // Also check unseenOnly cache
      const unseenData = queryClient.getQueryData<Email[]>(['email-inbox', 50, true]);
      return unseenData?.find((email) => email.uid === uid);
    },
    initialDataUpdatedAt: () => {
      // Use inbox query's dataUpdatedAt for stale time calculation
      return queryClient.getQueryState(['email-inbox', 50, false])?.dataUpdatedAt;
    },
  });
}

/**
 * Fetch single draft by ID
 */
export function useDraft(draftId: string | undefined) {
  return useQuery({
    queryKey: ['email-draft', draftId],
    queryFn: async () => {
      const { data } = await apiClient.get<Draft>(`/api/modules/email-client/drafts/${draftId}`);
      return data;
    },
    enabled: !!draftId,
  });
}

/**
 * Update existing draft
 */
export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId, data: draftData }: {
      draftId: string;
      data: {
        to?: string[];
        cc?: string[];
        bcc?: string[];
        subject?: string;
        textContent?: string;
        htmlContent?: string;
      };
    }) => {
      const { data } = await apiClient.patch<Draft>(`/api/modules/email-client/drafts/${draftId}`, draftData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['email-draft', variables.draftId] });
    },
  });
}

/**
 * Delete draft
 */
export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      await apiClient.delete(`/api/modules/email-client/drafts/${draftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

/**
 * List email folders
 */
export function useFolders() {
  return useQuery({
    queryKey: ['email-folders'],
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/api/modules/email-client/messages/folders');
      return data;
    },
  });
}

/**
 * Fetch emails from specific folder
 */
export function useFolder(folderName: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['email-folder', folderName, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<Email[]>(`/api/modules/email-client/messages/folder/${folderName}`, {
        params: { limit },
      });
      return data;
    },
    enabled: !!folderName,
  });
}

/**
 * Mark emails as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageUids: number[]) => {
      const { data } = await apiClient.patch('/api/modules/email-client/messages/mark-read', { messageUids });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['email-folder'] });
    },
  });
}

/**
 * Delete emails
 */
export function useDeleteEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageUids: number[]) => {
      const { data } = await apiClient.delete('/api/modules/email-client/messages', {
        data: { messageUids },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['email-folder'] });
    },
  });
}

/**
 * Generate AI draft reply using AI Agent module
 */
export function useGenerateAiDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      messageUid: number;
      tone?: 'formal' | 'casual' | 'neutral';
      length?: 'short' | 'medium' | 'long';
      customInstructions?: string;
    }) => {
      const { data } = await apiClient.post<Draft>('/api/modules/email-client/drafts/ai/generate-reply', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
    },
  });
}

/**
 * List AI-generated drafts
 */
export function useAiDrafts() {
  return useQuery({
    queryKey: ['ai-drafts'],
    queryFn: async () => {
      const { data } = await apiClient.get<Draft[]>('/api/modules/email-client/drafts/ai');
      return data;
    },
  });
}

interface UploadedAttachment {
  path: string;
  filename: string;
  size: number;
}

/**
 * Upload email attachment
 */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedAttachment> => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post<UploadedAttachment>(
        '/api/modules/email-client/attachments/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    },
  });
}

/**
 * Get attachment download URL
 */
export function getAttachmentDownloadUrl(filePath: string): string {
  return `/api/modules/email-client/attachments/download/${filePath}`;
}

interface StreamState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  draftId: string | null;
}

interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  draftId?: string;
  error?: string;
}

/**
 * Hook for streaming AI draft generation.
 * Returns state and a function to start streaming.
 */
export function useGenerateAiDraftStream() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    content: '',
    error: null,
    draftId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (params: {
    messageUid: number;
    tone?: 'formal' | 'casual' | 'neutral';
    length?: 'short' | 'medium' | 'long';
    customInstructions?: string;
  }) => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      isStreaming: true,
      content: '',
      error: null,
      draftId: null,
    });

    try {
      // Get auth token using centralized token storage
      const token = tokenStorage.getAccessToken();

      const response = await fetch('/api/modules/email-client/drafts/ai/generate-reply-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const chunk: StreamChunk = JSON.parse(data);

              if (chunk.type === 'content' && chunk.content) {
                setState(prev => ({
                  ...prev,
                  content: prev.content + chunk.content,
                }));
              } else if (chunk.type === 'done' && chunk.draftId) {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  draftId: chunk.draftId || null,
                }));
                // Invalidate queries to refresh draft lists
                queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
                queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
              } else if (chunk.type === 'error') {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: chunk.error || 'Unknown error',
                }));
              }
            } catch {
              // Ignore parse errors for incomplete data
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Stream was intentionally aborted
        setState(prev => ({ ...prev, isStreaming: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: (error as Error).message || 'Failed to generate AI reply',
      }));
    }
  }, [queryClient]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    stopStream();
    setState({
      isStreaming: false,
      content: '',
      error: null,
      draftId: null,
    });
  }, [stopStream]);

  return {
    ...state,
    startStream,
    stopStream,
    reset,
  };
}
