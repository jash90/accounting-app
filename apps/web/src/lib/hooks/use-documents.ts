import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { documentsApi } from '@/lib/api/endpoints/documents';

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ['documents', 'templates'],
    queryFn: documentsApi.getTemplates,
  });
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', 'templates'] }),
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof documentsApi.updateTemplate>[1];
    }) => documentsApi.updateTemplate(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', 'templates'] }),
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', 'templates'] }),
  });
}

export function useGeneratedDocuments() {
  return useQuery({
    queryKey: ['documents', 'generated'],
    queryFn: documentsApi.getGeneratedDocuments,
  });
}

export function useGenerateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.generateDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', 'generated'] }),
  });
}
