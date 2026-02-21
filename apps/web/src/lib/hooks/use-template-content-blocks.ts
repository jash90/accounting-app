import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type UpdateContentBlocksDto } from '@/types/dtos';

import { offerTemplatesApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';
import { getApiErrorMessage } from '../utils/query-filters';

export function useTemplateContentBlocks(id: string) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.contentBlocks(id),
    queryFn: () => offerTemplatesApi.getContentBlocks(id),
    enabled: !!id,
  });
}

export function useUpdateContentBlocks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContentBlocksDto }) =>
      offerTemplatesApi.updateContentBlocks(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.offerTemplates.contentBlocks(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.offerTemplates.detail(variables.id),
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
