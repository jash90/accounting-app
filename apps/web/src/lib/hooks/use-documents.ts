import { useMutation } from '@tanstack/react-query';

import { documentsApi } from '@/lib/api/endpoints/documents';
import { queryKeys } from '@/lib/api/query-client';

import { createMutationHook } from './create-mutation-hook';
import { createQueryHook } from './create-query-hook';

export const useDocumentTemplates = createQueryHook({
  queryKey: () => queryKeys.documents.templates,
  queryFn: documentsApi.getTemplates,
});

export const useCreateDocumentTemplate = createMutationHook({
  mutationFn: documentsApi.createTemplate,
  invalidateKeys: [queryKeys.documents.templates],
});

export const useUpdateDocumentTemplate = createMutationHook<
  unknown,
  { id: string; data: Parameters<typeof documentsApi.updateTemplate>[1] }
>({
  mutationFn: ({ id, data }) => documentsApi.updateTemplate(id, data),
  invalidateKeys: [queryKeys.documents.templates],
});

export const useDeleteDocumentTemplate = createMutationHook({
  mutationFn: documentsApi.deleteTemplate,
  invalidateKeys: [queryKeys.documents.templates],
});

export const useGeneratedDocuments = createQueryHook({
  queryKey: () => queryKeys.documents.generated,
  queryFn: documentsApi.getGeneratedDocuments,
});

export const useGenerateDocument = createMutationHook({
  mutationFn: documentsApi.generateDocument,
  invalidateKeys: [queryKeys.documents.generated],
});

export const useDeleteGeneratedDocument = createMutationHook({
  mutationFn: documentsApi.deleteGeneratedDocument,
  invalidateKeys: [queryKeys.documents.generated],
});

export function useDownloadDocumentPdf() {
  return useMutation({
    mutationFn: documentsApi.downloadPdf,
  });
}
