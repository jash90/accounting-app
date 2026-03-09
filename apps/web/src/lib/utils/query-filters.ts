/**
 * Type-safe query filter builder for React Query.
 * Converts filter DTOs to query key compatible format without type casting.
 */

/**
 * Builds a type-safe query key filter object from a filter DTO.
 * Removes undefined values and returns a clean object suitable for query keys.
 *
 * @param filters - The filter DTO object (can be undefined)
 * @returns A clean object with only defined values, or undefined if no filters
 *
 * @example
 * ```ts
 * const filters: OfferFiltersDto = { status: 'DRAFT', search: undefined };
 * buildQueryFilters(filters) // { status: 'DRAFT' }
 * buildQueryFilters(undefined) // undefined
 * ```
 */
export function buildQueryFilters<T extends object>(
  filters: T | undefined
): Record<string, unknown> | undefined {
  if (!filters) {
    return undefined;
  }

  const cleanedFilters: Record<string, unknown> = {};
  let hasValues = false;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanedFilters[key] = value;
      hasValues = true;
    }
  }

  return hasValues ? cleanedFilters : undefined;
}

/**
 * Type guard to check if a value is an API error response with nested message.
 */
export function isApiErrorResponse(
  error: unknown
): error is { response?: { data?: { message?: string } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  );
}

/**
 * Extracts error message from an API error response.
 *
 * @param error - The error object
 * @param fallback - Fallback message if extraction fails
 * @returns The error message
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiErrorResponse(error)) {
    return error.response?.data?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
