import { type Query, type QueryClient } from '@tanstack/react-query';

import { type PaginatedResponse } from '@/types/api';

import { type SettlementResponseDto } from '../api/endpoints/settlements';
import { queryKeys } from '../api/query-client';

/**
 * Predicate to identify settlement list queries for invalidation.
 * Prevents unnecessary refetches of individual detail queries.
 */
export const isSettlementListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === 'settlements' && key[1] === 'list';
};

/**
 * Creates a predicate to invalidate all settlement stats queries for a specific month/year.
 * Batches what would be 3 separate invalidation calls (overview, employees, my) into 1.
 */
export const createStatsInvalidationPredicate = (month: number, year: number) => {
  return (query: Query): boolean => {
    const key = query.queryKey;
    return (
      Array.isArray(key) &&
      key[0] === 'settlements' &&
      key[1] === 'stats' &&
      key[3] === month &&
      key[4] === year
    );
  };
};

/**
 * Context returned from onMutate for optimistic updates.
 * Used for rollback on error.
 */
export interface SettlementOptimisticContext {
  previousDetail: SettlementResponseDto | undefined;
  listQueries: [readonly unknown[], PaginatedResponse<SettlementResponseDto> | undefined][];
}

/**
 * Performs optimistic updates for settlement mutations.
 * Extracts common logic from useUpdateSettlementStatus and useAssignSettlement.
 *
 * @param queryClient - The React Query client
 * @param settlementId - The settlement being updated
 * @param updates - Partial settlement data to apply optimistically
 * @returns Context for rollback on error
 */
export async function performOptimisticSettlementUpdate(
  queryClient: QueryClient,
  settlementId: string,
  updates: Partial<SettlementResponseDto>
): Promise<SettlementOptimisticContext> {
  // Cancel any outgoing refetches in parallel to avoid overwriting optimistic update
  await Promise.all([
    queryClient.cancelQueries({ predicate: isSettlementListQuery }),
    queryClient.cancelQueries({
      queryKey: queryKeys.settlements.detail(settlementId),
    }),
  ]);

  // Snapshot the previous values
  const previousDetail = queryClient.getQueryData<SettlementResponseDto>(
    queryKeys.settlements.detail(settlementId)
  );

  // Snapshot all list queries that match the predicate
  const listQueries = queryClient.getQueriesData<PaginatedResponse<SettlementResponseDto>>({
    predicate: isSettlementListQuery,
  });

  // Optimistically update detail query
  if (previousDetail) {
    queryClient.setQueryData<SettlementResponseDto>(queryKeys.settlements.detail(settlementId), {
      ...previousDetail,
      ...updates,
    });
  }

  // Optimistically update all list queries
  listQueries.forEach(([queryKey, data]) => {
    if (data?.data) {
      queryClient.setQueryData<PaginatedResponse<SettlementResponseDto>>(queryKey, {
        ...data,
        data: data.data.map((settlement) =>
          settlement.id === settlementId
            ? {
                ...settlement,
                ...updates,
              }
            : settlement
        ),
      });
    }
  });

  return { previousDetail, listQueries };
}

/**
 * Rolls back optimistic updates when a mutation fails.
 *
 * @param queryClient - The React Query client
 * @param settlementId - The settlement that was being updated
 * @param context - The context from onMutate containing previous values
 */
export function rollbackOptimisticSettlementUpdate(
  queryClient: QueryClient,
  settlementId: string,
  context: SettlementOptimisticContext | undefined
): void {
  if (!context) return;

  // Rollback detail query
  if (context.previousDetail) {
    queryClient.setQueryData(queryKeys.settlements.detail(settlementId), context.previousDetail);
  }

  // Rollback list queries
  context.listQueries.forEach(([queryKey, data]) => {
    if (data) {
      queryClient.setQueryData(queryKey, data);
    }
  });
}

/**
 * Invalidates settlement queries after a mutation settles (success or error).
 *
 * @param queryClient - The React Query client
 * @param settlementId - The settlement that was updated
 * @param settlement - The settlement data (from response or cache) to extract month/year
 */
export async function invalidateSettlementQueries(
  queryClient: QueryClient,
  settlementId: string,
  settlement: SettlementResponseDto | null | undefined
): Promise<void> {
  queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(settlementId) });
  queryClient.invalidateQueries({ predicate: isSettlementListQuery });

  // Narrow stats invalidation: only invalidate stats for the affected month/year
  if (settlement?.month && settlement?.year) {
    queryClient.invalidateQueries({
      predicate: createStatsInvalidationPredicate(settlement.month, settlement.year),
    });
  }
}
