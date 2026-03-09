/**
 * Standardized pagination constants for consistent UX across all modules.
 */
export const PAGINATION = {
  /** Default page size for standard list views (20 items) */
  DEFAULT_PAGE_SIZE: 20,
  /** Compact page size for embedded/card views (10 items) */
  COMPACT_PAGE_SIZE: 10,
  /** Large page size for bulk operations (50 items) */
  LARGE_PAGE_SIZE: 50,
} as const;
