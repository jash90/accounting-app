export interface PaginationInput {
  page?: number;
  limit?: number;
}

/**
 * Maximum allowed page size.
 * Acts as defense-in-depth alongside PaginationQueryDto's @Max(100) validator.
 * Prevents DoS via ?limit=999999 if the DTO validator is bypassed.
 */
const MAX_LIMIT = 100;

/**
 * Calculates page, limit, and skip offset from optional pagination params.
 * Centralises the repeated 3-line block that appears across all findAll services.
 *
 * Enforces bounds: page >= 1, 1 <= limit <= MAX_LIMIT.
 *
 * @param params - Optional pagination input (page / limit may be undefined)
 * @param defaultLimit - Default page size when limit is not provided (default: 20)
 */
export function calculatePagination(
  params?: PaginationInput,
  defaultLimit = 20
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params?.limit ?? defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
