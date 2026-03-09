import type { Query } from '@tanstack/react-query';

/**
 * Creates a predicate that matches paginated list queries for a given namespace.
 * Matches keys of the shape `[namespace, 'list', ...]` so that detail queries
 * and other sub-resources are NOT invalidated.
 *
 * @example
 * const isOfferListQuery = createListPredicate('offers');
 * // matches ['offers', 'list', filters] but not ['offers', id]
 */
export const createListPredicate =
  (namespace: string) =>
  (query: Query): boolean => {
    const key = query.queryKey;
    return Array.isArray(key) && key[0] === namespace && key[1] === 'list';
  };
