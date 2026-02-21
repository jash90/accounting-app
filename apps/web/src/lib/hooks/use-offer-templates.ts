import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import {
  type CreateOfferTemplateDto,
  type OfferTemplateFiltersDto,
  type UpdateOfferTemplateDto,
} from '@/types/dtos';

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

export function useCreateOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateData: CreateOfferTemplateDto) => offerTemplatesApi.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: isOfferTemplateListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został utworzony',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się utworzyć szablonu'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferTemplateDto }) =>
      offerTemplatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isOfferTemplateListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został zaktualizowany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować szablonu'),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteOfferTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offerTemplatesApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.offerTemplates.detail(deletedId) });
      queryClient.invalidateQueries({
        predicate: isOfferTemplateListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.default });
      toast({
        title: 'Sukces',
        description: 'Szablon został usunięty',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się usunąć szablonu'),
        variant: 'destructive',
      });
    },
  });
}

export function useUploadOfferTemplateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      offerTemplatesApi.uploadTemplate(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerTemplates.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isOfferTemplateListQuery,
        refetchType: 'active',
      });
      toast({
        title: 'Sukces',
        description: 'Plik szablonu został przesłany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się przesłać pliku szablonu'),
        variant: 'destructive',
      });
    },
  });
}

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
