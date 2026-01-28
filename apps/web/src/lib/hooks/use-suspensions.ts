import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';

import {
  suspensionsApi,
  type CreateSuspensionDto,
  type SuspensionResponseDto,
  type UpdateSuspensionDto,
} from '../api/endpoints/suspensions';
import { queryKeys } from '../api/query-client';

// ============================================
// Suspension Query Hooks
// ============================================

/**
 * Hook to fetch all suspensions for a client
 */
export function useClientSuspensions(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.suspensions.byClient(clientId),
    queryFn: () => suspensionsApi.getAll(clientId),
    enabled: !!clientId,
  });
}

/**
 * Hook to fetch a specific suspension
 */
export function useSuspension(clientId: string, suspensionId: string) {
  return useQuery({
    queryKey: queryKeys.clients.suspensions.detail(clientId, suspensionId),
    queryFn: () => suspensionsApi.getById(clientId, suspensionId),
    enabled: !!clientId && !!suspensionId,
  });
}

// ============================================
// Suspension Mutation Hooks
// ============================================

/**
 * Hook to create a new suspension for a client
 * Includes optimistic updates for better UX
 */
export function useCreateSuspension() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: CreateSuspensionDto }) =>
      suspensionsApi.create(clientId, data),
    onMutate: async ({ clientId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.suspensions.byClient(clientId),
      });

      // Snapshot the previous value
      const previousSuspensions = queryClient.getQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId)
      );

      // Optimistically add the new suspension
      // Calculate isActive based on dates (startDate <= today && (no endDate || endDate > today))
      const now = new Date();
      const startDate = new Date(data.startDate);
      const endDate = data.endDate ? new Date(data.endDate) : null;
      const isActive = startDate <= now && (endDate === null || endDate > now);

      const optimisticSuspension: SuspensionResponseDto = {
        id: `temp-${Date.now()}`,
        clientId,
        clientName: '',
        companyId: '',
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        createdById: '',
        isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId),
        (old = []) => [optimisticSuspension, ...old]
      );

      return { previousSuspensions, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousSuspensions !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.suspensions.byClient(context.clientId),
          context.previousSuspensions
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć zawieszenia',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Zawieszenie zostało utworzone',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.suspensions.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}

/**
 * Hook to update a suspension (e.g., set end date)
 * Includes optimistic updates for better UX
 */
export function useUpdateSuspension() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      clientId,
      suspensionId,
      data,
    }: {
      clientId: string;
      suspensionId: string;
      data: UpdateSuspensionDto;
    }) => suspensionsApi.update(clientId, suspensionId, data),
    onMutate: async ({ clientId, suspensionId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.suspensions.byClient(clientId),
      });

      // Snapshot the previous value
      const previousSuspensions = queryClient.getQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId)
      );

      // Optimistically update the suspension
      queryClient.setQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId),
        (old = []) =>
          old.map((suspension) =>
            suspension.id === suspensionId
              ? {
                  ...suspension,
                  endDate: data.endDate ?? suspension.endDate,
                  reason: data.reason ?? suspension.reason,
                  updatedAt: new Date().toISOString(),
                }
              : suspension
          )
      );

      return { previousSuspensions, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousSuspensions !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.suspensions.byClient(context.clientId),
          context.previousSuspensions
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować zawieszenia',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Zawieszenie zostało zaktualizowane',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.suspensions.byClient(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.suspensions.detail(variables.clientId, variables.suspensionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}

/**
 * Hook to delete a suspension
 * Includes optimistic updates for better UX
 */
export function useDeleteSuspension() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, suspensionId }: { clientId: string; suspensionId: string }) =>
      suspensionsApi.delete(clientId, suspensionId),
    onMutate: async ({ clientId, suspensionId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.clients.suspensions.byClient(clientId),
      });

      // Snapshot the previous value
      const previousSuspensions = queryClient.getQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId)
      );

      // Optimistically remove the suspension
      queryClient.setQueryData<SuspensionResponseDto[]>(
        queryKeys.clients.suspensions.byClient(clientId),
        (old = []) => old.filter((suspension) => suspension.id !== suspensionId)
      );

      return { previousSuspensions, clientId };
    },
    onError: (error: ApiErrorResponse, _, context) => {
      // Rollback on error
      if (context?.previousSuspensions !== undefined) {
        queryClient.setQueryData(
          queryKeys.clients.suspensions.byClient(context.clientId),
          context.previousSuspensions
        );
      }
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć zawieszenia',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Zawieszenie zostało usunięte',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.suspensions.byClient(variables.clientId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.clients.suspensions.detail(variables.clientId, variables.suspensionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clients.detail(variables.clientId),
      });
    },
  });
}
