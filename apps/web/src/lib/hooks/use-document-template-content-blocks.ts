import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type UpdateDocumentContentBlocksDto } from '@/lib/api/endpoints/documents';

import { documentsApi } from '../api/endpoints/documents';
import { queryKeys } from '../api/query-client';
import { getApiErrorMessage } from '../utils/query-filters';

export function useDocumentTemplateContentBlocks(id: string) {
  return useQuery({
    queryKey: queryKeys.documentTemplates.contentBlocks(id),
    queryFn: () => documentsApi.getContentBlocks(id),
    enabled: !!id,
  });
}

export function useUpdateDocumentTemplateContentBlocks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentContentBlocksDto }) =>
      documentsApi.updateContentBlocks(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentTemplates.contentBlocks(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentTemplates.detail(variables.id),
      });
      toast({
        title: 'Sukces',
        description: 'Bloki treści zostały zapisane',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zapisać bloków treści'),
        variant: 'destructive',
      });
    },
  });
}
