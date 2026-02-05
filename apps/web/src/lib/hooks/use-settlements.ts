import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useToast } from '@/components/ui/use-toast';
import { type PaginatedResponse } from '@/types/api';

import {
  settlementsApi,
  type AssignSettlementDto,
  type BulkAssignDto,
  type CreateCommentDto,
  type EmployeeStatsListDto,
  type GetSettlementsQueryDto,
  type InitializeMonthDto,
  type SettlementResponseDto,
  type UpdateSettlementDto,
  type UpdateSettlementStatusDto,
} from '../api/endpoints/settlements';
import { queryKeys } from '../api/query-client';
import {
  createStatsInvalidationPredicate,
  invalidateSettlementQueries,
  isSettlementListQuery,
  performOptimisticSettlementUpdate,
  rollbackOptimisticSettlementUpdate,
} from '../utils/optimistic-settlement-updates';

// ============================================
// Helper Functions
// ============================================

/**
 * Extracts error message from Axios error response or returns fallback.
 * Uses axios's isAxiosError type guard for type-safe access.
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return fallback;
};

// ============================================
// Settlement List Hooks
// ============================================

export function useSettlements(filters: GetSettlementsQueryDto) {
  return useQuery({
    queryKey: queryKeys.settlements.list(filters),
    queryFn: () => settlementsApi.getAll(filters),
    // Prevents unnecessary API calls when navigating back to settlements list
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: queryKeys.settlements.detail(id),
    queryFn: () => settlementsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Statistics Hooks
// ============================================

export function useSettlementStats(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.overview(month, year),
    queryFn: () => settlementsApi.getOverviewStats(month, year),
    enabled: !!month && !!year,
    staleTime: 60 * 1000, // 1 minute - stats change less frequently
  });
}

export function useEmployeeStats(
  month: number,
  year: number,
  options?: Partial<UseQueryOptions<EmployeeStatsListDto>>
) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.employees(month, year),
    queryFn: () => settlementsApi.getEmployeeStats(month, year),
    enabled: !!month && !!year && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute default
    ...options,
  });
}

export function useMyStats(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.my(month, year),
    queryFn: () => settlementsApi.getMyStats(month, year),
    enabled: !!month && !!year,
    staleTime: 60 * 1000, // 1 minute - stats change less frequently
  });
}

/**
 * Combined hook to fetch all settlement stats in parallel.
 * Use this when a page needs all three stats (overview, employees, my) to avoid sequential fetching.
 * Returns an array of query results in order: [overview, employees, my].
 *
 * Performance: Reduces 3 sequential network requests to 1 parallel batch (50-100ms faster).
 */
export function useAllSettlementStats(month: number, year: number) {
  const enabled = !!month && !!year;

  return useQueries({
    queries: [
      {
        queryKey: queryKeys.settlements.stats.overview(month, year),
        queryFn: () => settlementsApi.getOverviewStats(month, year),
        enabled,
        staleTime: 60 * 1000,
      },
      {
        queryKey: queryKeys.settlements.stats.employees(month, year),
        queryFn: () => settlementsApi.getEmployeeStats(month, year),
        enabled,
        staleTime: 60 * 1000,
      },
      {
        queryKey: queryKeys.settlements.stats.my(month, year),
        queryFn: () => settlementsApi.getMyStats(month, year),
        enabled,
        staleTime: 60 * 1000,
      },
    ],
  });
}

/**
 * Combined hook to fetch team page data in parallel.
 * Fetches both employee stats and unassigned settlements concurrently.
 *
 * Performance: Reduces 2 sequential network requests to 1 parallel batch (30-50ms faster).
 */
export function useTeamPageData(month: number, year: number) {
  const enabled = !!month && !!year;

  const unassignedParams: GetSettlementsQueryDto = {
    month,
    year,
    unassigned: true,
    limit: 100,
  };

  return useQueries({
    queries: [
      {
        queryKey: queryKeys.settlements.stats.employees(month, year),
        queryFn: () => settlementsApi.getEmployeeStats(month, year),
        enabled,
        staleTime: 60 * 1000,
      },
      {
        queryKey: queryKeys.settlements.list(unassignedParams),
        queryFn: () => settlementsApi.getAll(unassignedParams),
        enabled,
        staleTime: 30 * 1000,
      },
    ],
  });
}

// ============================================
// Initialization Hooks
// ============================================

export function useInitializeMonth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: InitializeMonthDto) => settlementsApi.initializeMonth(dto),
    onSuccess: (result, variables) => {
      // Surgical invalidation - only invalidate what actually changes:
      // 1. List queries - new settlements were created
      queryClient.invalidateQueries({ predicate: isSettlementListQuery });

      // 2. Stats for the initialized month - totals have changed
      // Batch invalidation: replaces 3 separate calls with 1 predicate
      queryClient.invalidateQueries({
        predicate: createStatsInvalidationPredicate(variables.month, variables.year),
      });

      // Note: Comments and individual settlement details are NOT invalidated
      // because initialization only creates new settlements, it doesn't modify existing ones

      toast({
        title: 'Sukces',
        description: `Zainicjalizowano miesiąc: utworzono ${result.created} rozliczeń, pominięto ${result.skipped}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się zainicjalizować miesiąca'),
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Update Hooks
// ============================================

export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSettlementDto }) =>
      settlementsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific detail query
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(variables.id) });
      // Only invalidate list queries, not all settlement queries (stats, comments, etc.)
      queryClient.invalidateQueries({ predicate: isSettlementListQuery });
      toast({
        title: 'Sukces',
        description: 'Rozliczenie zostało zaktualizowane',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się zaktualizować rozliczenia'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSettlementStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSettlementStatusDto }) =>
      settlementsApi.updateStatus(id, data),

    // Optimistic update for immediate UI feedback
    onMutate: async (variables) => {
      return performOptimisticSettlementUpdate(queryClient, variables.id, {
        status: variables.data.status,
        notes: variables.data.notes,
      });
    },

    onError: (error: unknown, variables, context) => {
      rollbackOptimisticSettlementUpdate(queryClient, variables.id, context);
      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się zmienić statusu rozliczenia'),
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Status rozliczenia został zmieniony',
      });
    },

    // Always refetch after error or success to ensure server state consistency
    onSettled: async (data, __, variables) => {
      const settlement =
        data ??
        queryClient.getQueryData<SettlementResponseDto>(queryKeys.settlements.detail(variables.id));
      await invalidateSettlementQueries(queryClient, variables.id, settlement);
    },
  });
}

// ============================================
// Assignment Hooks
// ============================================

export function useAssignableUsers(settlementId: string) {
  return useQuery({
    queryKey: queryKeys.settlements.assignableUsers.bySettlement(settlementId),
    queryFn: () => settlementsApi.getAssignableUsers(settlementId),
    enabled: !!settlementId,
    // Users list rarely changes - cache for 5 minutes to prevent unnecessary refetches
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllAssignableUsers() {
  return useQuery({
    queryKey: queryKeys.settlements.assignableUsers.all,
    queryFn: () => settlementsApi.getAllAssignableUsers(),
    // Users list rarely changes - cache for 5 minutes to prevent unnecessary refetches
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignSettlementDto }) =>
      settlementsApi.assignToEmployee(id, data),

    // Optimistic update for immediate UI feedback
    onMutate: async (variables) => {
      return performOptimisticSettlementUpdate(queryClient, variables.id, {
        userId: variables.data.userId ?? null,
      });
    },

    onError: (error: unknown, variables, context) => {
      rollbackOptimisticSettlementUpdate(queryClient, variables.id, context);
      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się przypisać rozliczenia'),
        variant: 'destructive',
      });
    },

    onSuccess: (_, variables) => {
      toast({
        title: 'Sukces',
        description: variables.data.userId
          ? 'Rozliczenie zostało przypisane'
          : 'Rozliczenie zostało odłączone od pracownika',
      });
    },

    // Always refetch after error or success to ensure server state consistency
    onSettled: async (data, __, variables) => {
      const settlement =
        data ??
        queryClient.getQueryData<SettlementResponseDto>(queryKeys.settlements.detail(variables.id));
      await invalidateSettlementQueries(queryClient, variables.id, settlement);
    },
  });
}

export function useBulkAssignSettlements(currentMonth?: number, currentYear?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkAssignDto) => settlementsApi.bulkAssign(dto),

    // Optimistic update for immediate UI feedback
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ predicate: isSettlementListQuery });

      // Snapshot all list queries that match the predicate
      const listQueries = queryClient.getQueriesData<PaginatedResponse<SettlementResponseDto>>({
        predicate: isSettlementListQuery,
      });

      // Create a Set for O(1) lookup of settlement IDs being assigned
      const settlementIdsToAssign = new Set(variables.settlementIds);

      // Optimistically update all list queries
      listQueries.forEach(([queryKey, data]) => {
        if (data?.data) {
          queryClient.setQueryData<PaginatedResponse<SettlementResponseDto>>(queryKey, {
            ...data,
            data: data.data.map((settlement) =>
              settlementIdsToAssign.has(settlement.id)
                ? {
                    ...settlement,
                    userId: variables.userId,
                  }
                : settlement
            ),
          });
        }
      });

      return { listQueries };
    },

    onError: (error: unknown, _variables, context) => {
      // Rollback list queries
      context?.listQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData(queryKey, data);
        }
      });

      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się przypisać rozliczeń'),
        variant: 'destructive',
      });
    },

    onSuccess: (result) => {
      toast({
        title: 'Sukces',
        description: `Przypisano ${result.assigned} z ${result.requested} rozliczeń`,
      });
    },

    // Always refetch after error or success to ensure server state consistency
    onSettled: async () => {
      // Use predicate to invalidate all settlement detail queries consistently
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'settlements' && key[1] === 'detail';
        },
      });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isSettlementListQuery });

      // Narrow stats invalidation: use provided month/year from hook parameters
      // Only invalidate if month/year are provided to avoid incorrect cache invalidation
      if (currentMonth && currentYear) {
        queryClient.invalidateQueries({
          predicate: createStatsInvalidationPredicate(currentMonth, currentYear),
        });
      }
    },
  });
}

// ============================================
// Comments Hooks
// ============================================

export function useSettlementComments(settlementId: string) {
  return useQuery({
    queryKey: queryKeys.settlements.comments(settlementId),
    queryFn: () => settlementsApi.getComments(settlementId),
    enabled: !!settlementId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Combined hook to fetch settlement and comments in parallel.
 * Use this on the comments page to avoid sequential fetching waterfall.
 * Returns an array of query results in order: [settlement, comments].
 *
 * Performance: Reduces 2 sequential network requests to 1 parallel batch (30-50ms faster).
 */
export function useSettlementCommentsPageData(settlementId: string) {
  const enabled = !!settlementId;

  return useQueries({
    queries: [
      {
        queryKey: queryKeys.settlements.detail(settlementId),
        queryFn: () => settlementsApi.getById(settlementId),
        enabled,
        staleTime: 30 * 1000,
      },
      {
        queryKey: queryKeys.settlements.comments(settlementId),
        queryFn: () => settlementsApi.getComments(settlementId),
        enabled,
        staleTime: 30 * 1000,
      },
    ],
  });
}

export function useAddSettlementComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ settlementId, data }: { settlementId: string; data: CreateCommentDto }) =>
      settlementsApi.addComment(settlementId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.comments(variables.settlementId),
      });
      toast({
        title: 'Sukces',
        description: 'Komentarz został dodany',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Błąd',
        description: getErrorMessage(error, 'Nie udało się dodać komentarza'),
        variant: 'destructive',
      });
    },
  });
}
