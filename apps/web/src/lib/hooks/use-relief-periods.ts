import { type ApiErrorResponse } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import {
  reliefPeriodsApi,
  ReliefType,
  ReliefTypeDurationMonths,
  ReliefTypeLabels,
  type CreateReliefPeriodDto,
  type ReliefPeriodResponseDto,
  type UpdateReliefPeriodDto,
} from '../api/endpoints/relief-periods';
import { queryKeys } from '../api/query-client';

// Re-export types for convenience
export { ReliefType, ReliefTypeDurationMonths, ReliefTypeLabels };
export type { CreateReliefPeriodDto, ReliefPeriodResponseDto, UpdateReliefPeriodDto };

// ============================================
// Relief Period Query Hooks
// ============================================

/**
 * Hook to fetch all relief periods for a client
 */
export function useClientReliefPeriods(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.reliefPeriods.byClient(clientId),
    queryFn: () => reliefPeriodsApi.getAll(clientId),
    enabled: !!clientId,
  });
}

/**
 * Hook to fetch a specific relief period
 */
export function useReliefPeriod(clientId: string, reliefId: string) {
  return useQuery({
    queryKey: queryKeys.clients.reliefPeriods.detail(clientId, reliefId),
    queryFn: () => reliefPeriodsApi.getById(clientId, reliefId),
    enabled: !!clientId && !!reliefId,
  });
}

// ============================================
// Relief Period Mutation Hooks
// ============================================

/**
 * Hook to create a new relief period for a client
 * Includes optimistic updates for better UX
 */
export function useCreateReliefPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: CreateReliefPeriodDto }) =>
      reliefPeriodsApi.create(clientId, data),
    onMutate: async ({ clientId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(clientId),
      });

      // Snapshot the previous value
      const previousReliefPeriods = queryClient.getQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId)
      );

      // Calculate endDate if not provided (using non-mutating addMonths from date-fns)
      const startDate = new Date(data.startDate);
      const endDate = data.endDate
        ? new Date(data.endDate)
        : addMonths(startDate, ReliefTypeDurationMonths[data.reliefType]);

      // Calculate isActive based on dates
      const now = new Date();
      const isActive = startDate <= now && endDate > now;

      const optimisticReliefPeriod: ReliefPeriodResponseDto = {
        id: `temp-${Date.now()}`,
        clientId,
        clientName: '',
        companyId: '',
        reliefType: data.reliefType,
        reliefTypeLabel: ReliefTypeLabels[data.reliefType],
        startDate: data.startDate,
        endDate: data.endDate || format(endDate, 'yyyy-MM-dd'),
        daysUntilEnd: null,
        isActive,
        createdById: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId),
        (old = []) => [optimisticReliefPeriod, ...old]
      );

      return { previousReliefPeriods, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousReliefPeriods !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.reliefPeriods.byClient(context.clientId),
          context.previousReliefPeriods
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć ulgi',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Ulga została utworzona',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}

/**
 * Hook to update a relief period
 * Includes optimistic updates for better UX
 */
export function useUpdateReliefPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      clientId,
      reliefId,
      data,
    }: {
      clientId: string;
      reliefId: string;
      data: UpdateReliefPeriodDto;
    }) => reliefPeriodsApi.update(clientId, reliefId, data),
    onMutate: async ({ clientId, reliefId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(clientId),
      });

      // Snapshot the previous value
      const previousReliefPeriods = queryClient.getQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId)
      );

      // Optimistically update the relief period
      queryClient.setQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId),
        (old = []) =>
          old.map((relief) =>
            relief.id === reliefId
              ? {
                  ...relief,
                  startDate: data.startDate ?? relief.startDate,
                  endDate: data.endDate ?? relief.endDate,
                  isActive: data.isActive ?? relief.isActive,
                  updatedAt: new Date().toISOString(),
                }
              : relief
          )
      );

      return { previousReliefPeriods, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousReliefPeriods !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.reliefPeriods.byClient(context.clientId),
          context.previousReliefPeriods
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować ulgi',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Ulga została zaktualizowana',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.reliefPeriods.detail(variables.clientId, variables.reliefId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}

/**
 * Hook to delete a relief period
 * Includes optimistic updates for better UX
 */
export function useDeleteReliefPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, reliefId }: { clientId: string; reliefId: string }) =>
      reliefPeriodsApi.delete(clientId, reliefId),
    onMutate: async ({ clientId, reliefId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(clientId),
      });

      // Snapshot the previous value
      const previousReliefPeriods = queryClient.getQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId)
      );

      // Optimistically remove the relief period
      queryClient.setQueryData<ReliefPeriodResponseDto[]>(
        queryKeys.clients.reliefPeriods.byClient(clientId),
        (old = []) => old.filter((relief) => relief.id !== reliefId)
      );

      return { previousReliefPeriods, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousReliefPeriods !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.reliefPeriods.byClient(context.clientId),
          context.previousReliefPeriods
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć ulgi',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Ulga została usunięta',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.reliefPeriods.byClient(variables.clientId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.clients.reliefPeriods.detail(variables.clientId, variables.reliefId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}
