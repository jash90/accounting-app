export interface PaginationInput {
  page?: number;
  limit?: number;
}

/**
 * Calculates page, limit, and skip offset from optional pagination params.
 * Centralises the repeated 3-line block that appears across all findAll services.
 *
 * @param params - Optional pagination input (page / limit may be undefined)
 * @param defaultLimit - Default page size when limit is not provided (default: 20)
 */
export function calculatePagination(
  params?: PaginationInput,
  defaultLimit = 20
): { page: number; limit: number; skip: number } {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}
