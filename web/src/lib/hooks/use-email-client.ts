import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

interface Email {
  uid: number;
  seqno: number;
  subject: string;
  from: { address: string; name?: string }[];
  to: { address: string; name?: string }[];
  date: Date;
  text: string;
  html?: string;
  flags: string[];
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
 */
export function useEmail(uid: number | undefined) {
  return useQuery({
    queryKey: ['email', uid],
    queryFn: async () => {
      const { data } = await apiClient.get<Email>(`/api/modules/email-client/messages/${uid}`);
      return data;
    },
    enabled: !!uid,
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
