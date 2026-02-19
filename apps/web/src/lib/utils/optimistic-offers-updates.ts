import { type Query, type QueryClient } from '@tanstack/react-query';

import { type PaginatedResponse } from '@/types/api';
import { type OfferResponseDto } from '@/types/dtos';

import { queryKeys } from '../api/query-client';

/**
 * Cache time constants for offers module queries.
 * Differentiated based on data volatility.
 */
export const OFFERS_CACHE_TIMES = {
  /** Lists: 30 seconds - frequently updated */
  list: 30 * 1000,
  /** Statistics: 60 seconds - less volatile */
  statistics: 60 * 1000,
  /** Templates: 5 minutes - stable */
  templates: 5 * 60 * 1000,
  /** Placeholders: 10 minutes - rarely change */
  placeholders: 10 * 60 * 1000,
} as const;

/**
 * Debounce tracker to prevent race conditions from rapid updates.
 * Maps offerId to the timestamp of the last optimistic update.
 */
const optimisticUpdateTimestamps = new Map<string, number>();

/**
 * Minimum time (ms) between optimistic updates to the same offer.
 * Prevents race conditions from rapid repeated mutations.
 */
const OPTIMISTIC_UPDATE_DEBOUNCE_MS = 100;

/**
 * Predicate to identify offer list queries for invalidation.
 * Prevents unnecessary refetches of individual detail queries.
 */
export const isOfferListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === 'offers' && key[1] === 'list';
};

/**
 * Predicate to identify lead list queries for invalidation.
 */
export const isLeadListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === 'leads' && key[1] === 'list';
};

/**
 * Predicate to identify offer template list queries for invalidation.
 */
export const isOfferTemplateListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === 'offer-templates' && key[1] === 'list';
};

/**
 * Context returned from onMutate for optimistic updates.
 * Used for rollback on error.
 */
export interface OfferOptimisticContext {
  /** Previous detail query data (undefined if query didn't exist) */
  previousDetail: OfferResponseDto | undefined;
  /** Array of [queryKey, data] tuples for all list queries */
  listQueries: [readonly unknown[], PaginatedResponse<OfferResponseDto> | undefined][];
  /** Timestamp when this optimistic update was applied */
  timestamp: number;
  /** Whether this context is valid for rollback (prevents stale rollbacks) */
  isValid: boolean;
}

/**
 * Performs optimistic updates for offer mutations.
 * Extracts common logic from useUpdateOffer, useUpdateOfferStatus, and useSendOffer.
 *
 * Edge cases handled:
 * - Race conditions from rapid updates (debouncing)
 * - Missing detail queries (graceful handling)
 * - Empty list queries (safe no-op)
 * - Stale context rollback prevention (timestamp validation)
 *
 * @param queryClient - The React Query client
 * @param offerId - The offer being updated
 * @param updates - Partial offer data to apply optimistically
 * @returns Context for rollback on error
 */
export async function performOptimisticOfferUpdate(
  queryClient: QueryClient,
  offerId: string,
  updates: Partial<OfferResponseDto>
): Promise<OfferOptimisticContext> {
  const now = Date.now();

  // Check for rapid successive updates (race condition prevention)
  const lastUpdate = optimisticUpdateTimestamps.get(offerId);
  if (lastUpdate && now - lastUpdate < OPTIMISTIC_UPDATE_DEBOUNCE_MS) {
    // Return minimal context that won't trigger rollback
    return {
      previousDetail: undefined,
      listQueries: [],
      timestamp: now,
      isValid: false,
    };
  }

  // Track this update's timestamp
  optimisticUpdateTimestamps.set(offerId, now);

  // Cancel any outgoing refetches in parallel to avoid overwriting optimistic update
  await Promise.all([
    queryClient.cancelQueries({ predicate: isOfferListQuery }),
    queryClient.cancelQueries({
      queryKey: queryKeys.offers.detail(offerId),
    }),
  ]);

  // Snapshot the previous values (may be undefined if query doesn't exist)
  const previousDetail = queryClient.getQueryData<OfferResponseDto>(
    queryKeys.offers.detail(offerId)
  );

  // Snapshot all list queries that match the predicate
  // Returns empty array if no list queries exist
  const listQueries = queryClient.getQueriesData<PaginatedResponse<OfferResponseDto>>({
    predicate: isOfferListQuery,
  });

  // Optimistically update detail query only if it exists
  // This prevents creating orphan cache entries for offers that haven't been viewed
  if (previousDetail) {
    queryClient.setQueryData<OfferResponseDto>(queryKeys.offers.detail(offerId), {
      ...previousDetail,
      ...updates,
    });
  }

  // Optimistically update all list queries
  // Safe iteration - handles empty arrays and undefined data gracefully
  listQueries.forEach(([queryKey, data]) => {
    // Skip queries with no data or empty data arrays
    if (!data?.data || data.data.length === 0) return;

    // Only update if the offer exists in this list
    const offerIndex = data.data.findIndex((offer) => offer.id === offerId);
    if (offerIndex === -1) return;

    queryClient.setQueryData<PaginatedResponse<OfferResponseDto>>(queryKey, {
      ...data,
      data: data.data.map((offer) =>
        offer.id === offerId
          ? {
              ...offer,
              ...updates,
            }
          : offer
      ),
    });
  });

  return {
    previousDetail,
    listQueries,
    timestamp: now,
    isValid: true,
  };
}

/**
 * Rolls back optimistic updates when a mutation fails.
 *
 * Edge cases handled:
 * - Undefined context (no-op)
 * - Invalid context from debounced updates (no-op)
 * - Stale context from newer updates (skip rollback)
 * - Missing previous data (safe no-op)
 *
 * @param queryClient - The React Query client
 * @param offerId - The offer that was being updated
 * @param context - The context from onMutate containing previous values
 */
export function rollbackOptimisticOfferUpdate(
  queryClient: QueryClient,
  offerId: string,
  context: OfferOptimisticContext | undefined
): void {
  // Guard: No context to rollback
  if (!context) return;

  // Guard: Context was marked as invalid (e.g., from debounced update)
  if (!context.isValid) return;

  // Guard: A newer optimistic update has occurred - don't rollback to stale data
  // This prevents race conditions where a fast failure rolls back a newer success
  const latestTimestamp = optimisticUpdateTimestamps.get(offerId);
  if (latestTimestamp && latestTimestamp > context.timestamp) {
    return;
  }

  // Rollback detail query only if we had previous data
  if (context.previousDetail) {
    queryClient.setQueryData(queryKeys.offers.detail(offerId), context.previousDetail);
  }

  // Rollback list queries
  context.listQueries.forEach(([queryKey, data]) => {
    if (data) {
      queryClient.setQueryData(queryKey, data);
    }
  });

  // Clean up timestamp tracker after successful rollback
  optimisticUpdateTimestamps.delete(offerId);
}

/**
 * Invalidates offer queries after a mutation settles (success or error).
 * Uses predicate-based invalidation for efficient cache updates.
 *
 * @param queryClient - The React Query client
 * @param offerId - The offer that was updated
 * @param options - Additional invalidation options
 */
export async function invalidateOfferQueries(
  queryClient: QueryClient,
  offerId: string,
  options: {
    includeStatistics?: boolean;
    includeActivities?: boolean;
  } = {}
): Promise<void> {
  const { includeStatistics = false, includeActivities = false } = options;

  // Clean up timestamp tracker after successful mutation
  optimisticUpdateTimestamps.delete(offerId);

  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.offers.detail(offerId) }),
    queryClient.invalidateQueries({
      predicate: isOfferListQuery,
      refetchType: 'active',
    }),
  ];

  if (includeStatistics) {
    promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.offers.statistics }));
  }

  if (includeActivities) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.offers.activities(offerId) })
    );
  }

  await Promise.all(promises);
}

/**
 * Clears the optimistic update timestamp tracker for testing or cleanup.
 * Should be called when unmounting components that use optimistic updates.
 */
export function clearOptimisticUpdateTrackers(): void {
  optimisticUpdateTimestamps.clear();
}
