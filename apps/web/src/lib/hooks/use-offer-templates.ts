import { useMutation, useQuery } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import {
  type CreateOfferTemplateDto,
  type OfferTemplateFiltersDto,
  type UpdateOfferTemplateDto,
} from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { offerTemplatesApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';
import { downloadBlob } from '../utils/download';
import { isOfferTemplateListQuery, OFFERS_CACHE_TIMES } from '../utils/optimistic-offers-updates';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

export function useOfferTemplates(
  filters?: OfferTemplateFiltersDto,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.list(buildQueryFilters(filters)),
    queryFn: () => offerTemplatesApi.getAll(filters),
    staleTime: OFFERS_CACHE_TIMES.templates,
    enabled: options?.enabled,
  });
}

export function useOfferTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.detail(id),
    queryFn: () => offerTemplatesApi.getById(id),
    enabled: !!id,
    staleTime: OFFERS_CACHE_TIMES.templates,
  });
}

export function useDefaultOfferTemplate(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.default,
    queryFn: () => offerTemplatesApi.getDefault(),
    staleTime: OFFERS_CACHE_TIMES.templates,
    enabled: options?.enabled,
  });
}

export const useCreateOfferTemplate = createMutationHook<void, CreateOfferTemplateDto>({
  mutationFn: (templateData) => offerTemplatesApi.create(templateData),
  invalidateKeys: [queryKeys.offerTemplates.default],
  invalidatePredicate: isOfferTemplateListQuery,
  successMessage: 'Szablon został utworzony',
  errorMessage: 'Nie udało się utworzyć szablonu',
});

export const useUpdateOfferTemplate = createMutationHook<
  void,
  { id: string; data: UpdateOfferTemplateDto }
>({
  mutationFn: ({ id, data }) => offerTemplatesApi.update(id, data),
  invalidateKeys: [queryKeys.offerTemplates.default],
  invalidatePredicate: isOfferTemplateListQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
  },
  successMessage: 'Szablon został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować szablonu',
});

export const useDeleteOfferTemplate = createMutationHook<void, string>({
  mutationFn: (id) => offerTemplatesApi.delete(id),
  invalidateKeys: [queryKeys.offerTemplates.default],
  invalidatePredicate: isOfferTemplateListQuery,
  onSuccess: (_, deletedId, qc) => {
    qc.removeQueries({ queryKey: queryKeys.offerTemplates.detail(deletedId) });
  },
  successMessage: 'Szablon został usunięty',
  errorMessage: 'Nie udało się usunąć szablonu',
});

export const useUploadOfferTemplateFile = createMutationHook<
  void,
  { id: string; file: File }
>({
  mutationFn: ({ id, file }) => offerTemplatesApi.uploadTemplate(id, file),
  invalidatePredicate: isOfferTemplateListQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
  },
  successMessage: 'Plik szablonu został przesłany',
  errorMessage: 'Nie udało się przesłać pliku szablonu',
});

export function useDownloadOfferTemplateFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const blob = await offerTemplatesApi.downloadTemplate(id);
      const result = downloadBlob(blob, filename || 'szablon.docx');
      if (!result.success) {
        throw new Error(result.error || 'Nie udało się pobrać pliku');
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się pobrać pliku szablonu'),
        variant: 'destructive',
      });
    },
  });
}
