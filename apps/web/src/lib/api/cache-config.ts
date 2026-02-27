/**
 * Shared cache tier configuration for React Query.
 *
 * - frequent: lists and real-time views (30s stale, 5m gc)
 * - standard: detail views (1m stale, 10m gc)
 * - stable:   settings and lookup data (5m stale, 10m gc)
 */
export const CACHE_TIERS = {
  frequent: { staleTime: 30_000, gcTime: 5 * 60_000 },
  standard: { staleTime: 60_000, gcTime: 10 * 60_000 },
  stable: { staleTime: 5 * 60_000, gcTime: 10 * 60_000 },
} as const;
