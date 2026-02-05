import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import {
  type ConvertLeadToClientDto,
  type CreateLeadDto,
  type CreateOfferDto,
  type CreateOfferTemplateDto,
  type DuplicateOfferDto,
  type LeadFiltersDto,
  type OfferFiltersDto,
  type OfferResponseDto,
  type OfferTemplateFiltersDto,
  type SendOfferDto,
  type UpdateLeadDto,
  type UpdateOfferDto,
  type UpdateOfferStatusDto,
  type UpdateOfferTemplateDto,
} from '@/types/dtos';

import { leadsApi, offersApi, offerTemplatesApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';
import { downloadBlob } from '../utils/download';
import {
  invalidateOfferQueries,
  isLeadListQuery,
  isOfferListQuery,
  isOfferTemplateListQuery,
  OFFERS_CACHE_TIMES,
  performOptimisticOfferUpdate,
  rollbackOptimisticOfferUpdate,
  type OfferOptimisticContext,
} from '../utils/optimistic-offers-updates';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

// ============================================
// Offer Hooks
// ============================================

export function useOffers(filters?: OfferFiltersDto) {
  return useQuery({
    queryKey: queryKeys.offers.list(buildQueryFilters(filters)),
    queryFn: () => offersApi.getAll(filters),
    staleTime: OFFERS_CACHE_TIMES.list,
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: queryKeys.offers.detail(id),
    queryFn: () => offersApi.getById(id),
    enabled: !!id,
  });
}

export function useOfferActivities(offerId: string) {
  return useQuery({
    queryKey: queryKeys.offers.activities(offerId),
    queryFn: () => offersApi.getActivities(offerId),
    enabled: !!offerId,
  });
}

export function useOfferStatistics() {
  return useQuery({
    queryKey: queryKeys.offers.statistics,
    queryFn: () => offersApi.getStatistics(),
    staleTime: OFFERS_CACHE_TIMES.statistics,
  });
}

/**
 * Hook that fetches offer and lead statistics in parallel using useQueries.
 * This prevents the waterfall effect of sequential queries.
 */
export function useDashboardStatistics() {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.offers.statistics,
        queryFn: () => offersApi.getStatistics(),
        staleTime: OFFERS_CACHE_TIMES.statistics,
      },
      {
        queryKey: queryKeys.leads.statistics,
        queryFn: () => leadsApi.getStatistics(),
        staleTime: OFFERS_CACHE_TIMES.statistics,
      },
    ],
  });

  const [offerStatsResult, leadStatsResult] = results;

  return {
    offerStats: offerStatsResult.data,
    leadStats: leadStatsResult.data,
    isPending: offerStatsResult.isPending || leadStatsResult.isPending,
    offersLoading: offerStatsResult.isPending,
    leadsLoading: leadStatsResult.isPending,
    isError: offerStatsResult.isError || leadStatsResult.isError,
  };
}

export function useStandardPlaceholders() {
  return useQuery({
    queryKey: queryKeys.offers.placeholders,
    queryFn: () => offersApi.getStandardPlaceholders(),
    staleTime: OFFERS_CACHE_TIMES.placeholders,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (offerData: CreateOfferDto) => offersApi.create(offerData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: isOfferListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została utworzona',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się utworzyć oferty'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferDto }) => offersApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Perform optimistic update
      return performOptimisticOfferUpdate(queryClient, id, data as Partial<OfferResponseDto>);
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      rollbackOptimisticOfferUpdate(queryClient, variables.id, context as OfferOptimisticContext);
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować oferty'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Oferta została zaktualizowana',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after mutation settles
      invalidateOfferQueries(queryClient, variables.id, { includeActivities: true });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.offers.detail(deletedId) });
      queryClient.invalidateQueries({
        predicate: isOfferListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została usunięta',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się usunąć oferty'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOfferStatusDto }) =>
      offersApi.updateStatus(id, data),
    onMutate: async ({ id, data }) => {
      // Perform optimistic update with new status
      return performOptimisticOfferUpdate(queryClient, id, {
        status: data.status,
      } as Partial<OfferResponseDto>);
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      rollbackOptimisticOfferUpdate(queryClient, variables.id, context as OfferOptimisticContext);
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zmienić statusu oferty'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Status oferty został zmieniony',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after mutation settles
      invalidateOfferQueries(queryClient, variables.id, {
        includeActivities: true,
        includeStatistics: true,
      });
    },
  });
}

export function useGenerateOfferDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => offersApi.generateDocument(id),
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(offerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(offerId) });
      toast({
        title: 'Sukces',
        description: 'Dokument został wygenerowany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się wygenerować dokumentu'),
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadOfferDocument() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      const blob = await offersApi.downloadDocument(id);
      const result = downloadBlob(blob, filename || 'oferta.docx');
      if (!result.success) {
        throw new Error(result.error || 'Nie udało się pobrać pliku');
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się pobrać dokumentu'),
        variant: 'destructive',
      });
    },
  });
}

export function useSendOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SendOfferDto }) => offersApi.sendEmail(id, data),
    onMutate: async ({ id }) => {
      // Optimistically mark offer as sent (status: 'sent')
      return performOptimisticOfferUpdate(queryClient, id, {
        status: 'sent',
      } as Partial<OfferResponseDto>);
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      rollbackOptimisticOfferUpdate(queryClient, variables.id, context as OfferOptimisticContext);
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się wysłać oferty'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Oferta została wysłana',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after mutation settles
      invalidateOfferQueries(queryClient, variables.id, {
        includeActivities: true,
        includeStatistics: true,
      });
    },
  });
}

export function useDuplicateOffer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: DuplicateOfferDto }) =>
      offersApi.duplicate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: isOfferListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics });
      toast({
        title: 'Sukces',
        description: 'Oferta została zduplikowana',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zduplikować oferty'),
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Lead Hooks
// ============================================

export function useLeads(filters?: LeadFiltersDto) {
  return useQuery({
    queryKey: queryKeys.leads.list(buildQueryFilters(filters)),
    queryFn: () => leadsApi.getAll(filters),
    staleTime: OFFERS_CACHE_TIMES.list,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => leadsApi.getById(id),
    enabled: !!id,
  });
}

export function useLeadStatistics() {
  return useQuery({
    queryKey: queryKeys.leads.statistics,
    queryFn: () => leadsApi.getStatistics(),
    staleTime: OFFERS_CACHE_TIMES.statistics,
  });
}

export function useLeadAssignees() {
  return useQuery({
    queryKey: queryKeys.leads.lookupAssignees,
    queryFn: () => leadsApi.getAssignees(),
    staleTime: OFFERS_CACHE_TIMES.templates,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (leadData: CreateLeadDto) => leadsApi.create(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został utworzony',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się utworzyć leada'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDto }) => leadsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został zaktualizowany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować leada'),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.leads.detail(deletedId) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      toast({
        title: 'Sukces',
        description: 'Lead został usunięty',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się usunąć leada'),
        variant: 'destructive',
      });
    },
  });
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ConvertLeadToClientDto }) =>
      leadsApi.convertToClient(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({
        predicate: isLeadListQuery,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.statistics });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.all,
        refetchType: 'active',
      });
      toast({
        title: 'Sukces',
        description: result.message || 'Lead został przekonwertowany na klienta',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się przekonwertować leada'),
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Offer Template Hooks
// ============================================

export function useOfferTemplates(filters?: OfferTemplateFiltersDto) {
  return useQuery({
    queryKey: queryKeys.offerTemplates.list(buildQueryFilters(filters)),
    queryFn: () => offerTemplatesApi.getAll(filters),
    staleTime: OFFERS_CACHE_TIMES.templates,
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

export function useDefaultOfferTemplate() {
  return useQuery({
    queryKey: queryKeys.offerTemplates.default,
    queryFn: () => offerTemplatesApi.getDefault(),
    staleTime: OFFERS_CACHE_TIMES.templates,
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
