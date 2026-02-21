import { useCallback } from 'react';

import { prefetchRoute } from '@/lib/utils/prefetch';

/**
 * Hook to get a prefetch function for use with custom navigation components.
 * Returns a stable callback that can be attached to onMouseEnter/onFocus events.
 *
 * @param path - The route path to prefetch
 * @returns A stable callback function that triggers the prefetch
 *
 * @example
 * const prefetch = usePrefetchRoute('/modules/clients');
 *
 * <Button
 *   onMouseEnter={prefetch}
 *   onFocus={prefetch}
 *   onClick={() => navigate('/modules/clients')}
 * >
 *   Go to Clients
 * </Button>
 *
 * @example
 * // With multiple routes
 * const prefetchClients = usePrefetchRoute('/modules/clients');
 * const prefetchTasks = usePrefetchRoute('/modules/tasks');
 */
export function usePrefetchRoute(path: string): () => void {
  return useCallback(() => {
    prefetchRoute(path);
  }, [path]);
}
