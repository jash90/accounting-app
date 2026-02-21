import { useMemo } from 'react';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import {
  type CreateOfferDto,
  type DuplicateOfferDto,
  type OfferFiltersDto,
  type OfferResponseDto,
  type SendOfferDto,
  type UpdateOfferDto,
  type UpdateOfferStatusDto,
} from '@/types/dtos';

import { leadsApi, offersApi } from '../api/endpoints/offers';
import { queryKeys } from '../api/query-client';
import { downloadBlob } from '../utils/download';
import {
  invalidateOfferQueries,
  isOfferListQuery,
  OFFERS_CACHE_TIMES,
  performOptimisticOfferUpdate,
  rollbackOptimisticOfferUpdate,
  type OfferOptimisticContext,
} from '../utils/optimistic-offers-updates';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

// Re-export lead and template hooks for backwards compatibility
export {
  useLeads,
  useLead,
  useLeadStatistics,
  useLeadAssignees,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLeadToClient,
} from './use-leads';
export {
  useOfferTemplates,
  useOfferTemplate,
  useDefaultOfferTemplate,
  useCreateOfferTemplate,
  useUpdateOfferTemplate,
  useDeleteOfferTemplate,
  useUploadOfferTemplateFile,
  useDownloadOfferTemplateFile,
} from './use-offer-templates';

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
    staleTime: 5 * 60 * 1000,
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

  return useMemo(
    () => ({
      offerStats: offerStatsResult.data,
      leadStats: leadStatsResult.data,
      isPending: offerStatsResult.isPending || leadStatsResult.isPending,
      offersLoading: offerStatsResult.isPending,
      leadsLoading: leadStatsResult.isPending,
      isError: offerStatsResult.isError || leadStatsResult.isError,
    }),
    [
      offerStatsResult.data,
      offerStatsResult.isPending,
      offerStatsResult.isError,
      leadStatsResult.data,
      leadStatsResult.isPending,
      leadStatsResult.isError,
    ]
  );
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
      // Perform optimistic update with only safe scalar fields
      // UpdateOfferDto has different shapes for serviceTerms and dates,
      // so we only apply fields that are structurally compatible
      const safeUpdates: Partial<OfferResponseDto> = {};
      if (data.title !== undefined) safeUpdates.title = data.title;
      if (data.description !== undefined) safeUpdates.description = data.description;
      if (data.vatRate !== undefined) safeUpdates.vatRate = data.vatRate;
      return performOptimisticOfferUpdate(queryClient, id, safeUpdates);
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
        status: 'SENT',
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
