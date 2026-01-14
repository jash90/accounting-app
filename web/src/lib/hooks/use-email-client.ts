import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';

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
