import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

export function createQueryHook<TData, TArgs extends unknown[] = []>(config: {
  queryKey: (...args: TArgs) => QueryKey;
  queryFn: (...args: TArgs) => Promise<TData>;
  staleTime?: number;
  gcTime?: number;
  enabled?: (...args: TArgs) => boolean;
}) {
  return function (...args: TArgs): UseQueryResult<TData> {
    return useQuery({
      queryKey: config.queryKey(...args),
      queryFn: () => config.queryFn(...args),
      ...(config.staleTime !== undefined && { staleTime: config.staleTime }),
      ...(config.gcTime !== undefined && { gcTime: config.gcTime }),
      enabled: config.enabled?.(...args),
    });
  };
}
