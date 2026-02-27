import { type CreateModuleDto, type UpdateModuleDto } from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { createQueryHook } from './create-query-hook';
import { modulesApi } from '../api/endpoints/modules';
import { queryKeys } from '../api/query-client';

export const useModules = createQueryHook({
  queryKey: () => queryKeys.modules.all,
  queryFn: modulesApi.getAll,
});

export const useModule = createQueryHook({
  queryKey: (id: string) => queryKeys.modules.detail(id),
  queryFn: (id: string) => modulesApi.getByIdentifier(id),
  enabled: (id: string) => !!id,
});

export const useCreateModule = createMutationHook<void, CreateModuleDto>({
  mutationFn: (data) => modulesApi.create(data),
  invalidateKeys: [queryKeys.modules.all],
  successMessage: 'Moduł został utworzony',
  errorMessage: 'Nie udało się utworzyć modułu',
});

export const useUpdateModule = createMutationHook<void, { id: string; data: UpdateModuleDto }>({
  mutationFn: ({ id, data }) => modulesApi.update(id, data),
  invalidateKeys: [queryKeys.modules.all],
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(variables.id) });
  },
  successMessage: 'Moduł został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować modułu',
});

export const useDeleteModule = createMutationHook<void, string>({
  mutationFn: (id) => modulesApi.delete(id),
  invalidateKeys: [queryKeys.modules.all],
  successMessage: 'Moduł został usunięty',
  errorMessage: 'Nie udało się usunąć modułu',
});
