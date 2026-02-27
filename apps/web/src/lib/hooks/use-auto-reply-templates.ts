import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '../api/client';
import { queryKeys } from '../api/query-client';

export interface AutoReplyTemplate {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  triggerKeywords: string[];
  keywordMatchMode: string;
  matchSubjectOnly: boolean;
  bodyTemplate: string;
  tone: string;
  customInstructions?: string | null;
  matchCount: number;
  lastMatchedAt?: string | null;
}

const ENDPOINT = '/modules/email-client/auto-reply-templates';

export function useAutoReplyTemplates() {
  return useQuery({
    queryKey: queryKeys.email.autoReplyTemplates,
    queryFn: () => apiClient.get<AutoReplyTemplate[]>(ENDPOINT).then((r) => r.data),
  });
}

export function useCreateAutoReplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => apiClient.post(ENDPOINT, data).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.email.autoReplyTemplates }),
  });
}

export function useUpdateAutoReplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiClient.patch(`${ENDPOINT}/${id}`, data).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.email.autoReplyTemplates }),
  });
}

export function useDeleteAutoReplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`${ENDPOINT}/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.email.autoReplyTemplates }),
  });
}

export function useToggleAutoReplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`${ENDPOINT}/${id}`, { isActive }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.email.autoReplyTemplates }),
  });
}
