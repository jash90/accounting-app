import { type CreateEmployeeDto, type UpdateEmployeeDto } from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { createQueryHook } from './create-query-hook';
import { employeesApi } from '../api/endpoints/employees';
import { queryKeys } from '../api/query-client';

export const useEmployees = createQueryHook({
  queryKey: () => queryKeys.employees.all,
  queryFn: employeesApi.getAll,
});

export const useEmployee = createQueryHook({
  queryKey: (id: string) => queryKeys.employees.detail(id),
  queryFn: (id: string) => employeesApi.getById(id),
  enabled: (id: string) => !!id,
});

export const useCreateEmployee = createMutationHook<void, CreateEmployeeDto>({
  mutationFn: (data) => employeesApi.create(data),
  invalidateKeys: [queryKeys.employees.all],
  successMessage: 'Pracownik został utworzony',
  errorMessage: 'Nie udało się utworzyć pracownika',
});

export const useUpdateEmployee = createMutationHook<void, { id: string; data: UpdateEmployeeDto }>({
  mutationFn: ({ id, data }) => employeesApi.update(id, data),
  invalidateKeys: [queryKeys.employees.all],
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
  },
  successMessage: 'Pracownik został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować pracownika',
});

export const useDeleteEmployee = createMutationHook<void, string>({
  mutationFn: (id) => employeesApi.delete(id),
  invalidateKeys: [queryKeys.employees.all],
  successMessage: 'Pracownik został usunięty',
  errorMessage: 'Nie udało się usunąć pracownika',
});
