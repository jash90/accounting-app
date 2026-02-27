import { useMutation, useQueryClient, type Query, type QueryKey } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';

import { getApiErrorMessage } from '../utils/query-filters';

interface MutationHookConfig<TData, TVariables> {
  /** The async function that performs the mutation.
   *  When TData = void the factory doesn't use the resolved value, so any
   *  Promise return type is accepted (avoids forcing callers to wrap with void). */
  mutationFn: (vars: TVariables) => [TData] extends [void] ? Promise<unknown> : Promise<TData>;
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Predicate-based query invalidation (e.g. for list views) */
  invalidatePredicate?: (query: Query) => boolean;
  /**
   * Additional logic to run after default invalidations.
   * Use this for dynamic invalidations (e.g. invalidating a detail by variables.id)
   */
  onSuccess?: (
    data: TData,
    variables: TVariables,
    queryClient: ReturnType<typeof useQueryClient>
  ) => void;
  /** Toast message shown on success. Omit to skip the toast. */
  successMessage?: string;
  /**
   * Dynamic success message derived from the response data.
   * Takes priority over `successMessage` when provided.
   */
  successMessageFn?: (data: TData) => string;
  /** Toast title shown on error. Defaults to 'Błąd'. */
  errorTitle?: string;
  /** Fallback error message shown when the API doesn't return a specific error */
  errorMessage?: string;
}

/**
 * Factory for creating standard CRUD mutation hooks with consistent toast/invalidation patterns.
 *
 * @example
 * export const useCreateTaskLabel = createMutationHook<void, CreateTaskLabelDto>({
 *   mutationFn: (dto) => taskLabelsApi.create(dto),
 *   invalidateKeys: [queryKeys.taskLabels.all],
 *   successMessage: 'Etykieta została utworzona',
 *   errorMessage: 'Nie udało się utworzyć etykiety',
 * });
 */
export function createMutationHook<TData = unknown, TVariables = void>(
  config: MutationHookConfig<TData, TVariables>
) {
  return function () {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<TData, unknown, TVariables>({
      mutationFn: config.mutationFn as (vars: TVariables) => Promise<TData>,
      onSuccess: (data, variables) => {
        for (const key of config.invalidateKeys ?? []) {
          queryClient.invalidateQueries({ queryKey: key });
        }
        if (config.invalidatePredicate) {
          queryClient.invalidateQueries({ predicate: config.invalidatePredicate });
        }
        config.onSuccess?.(data, variables, queryClient);
        const message = config.successMessageFn
          ? config.successMessageFn(data)
          : config.successMessage;
        if (message) {
          toast({ title: 'Sukces', description: message });
        }
      },
      onError: (error) => {
        toast({
          title: config.errorTitle ?? 'Błąd',
          description: getApiErrorMessage(error, config.errorMessage ?? 'Wystąpił błąd'),
          variant: 'destructive',
        });
      },
    });
  };
}
