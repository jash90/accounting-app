import { useQuery } from '@tanstack/react-query';

import { type CreateUserDto, type UpdateUserDto } from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { usersApi } from '../api/endpoints/users';
import { queryKeys } from '../api/query-client';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export const useCreateUser = createMutationHook<void, CreateUserDto>({
  mutationFn: (data) => usersApi.create(data),
  invalidateKeys: [queryKeys.users.all],
  onSuccess: (_, __, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.availableOwners });
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
  },
  successMessage: 'Użytkownik został utworzony',
  errorMessage: 'Nie udało się utworzyć użytkownika',
});

export const useUpdateUser = createMutationHook<void, { id: string; data: UpdateUserDto }>({
  mutationFn: ({ id, data }) => usersApi.update(id, data),
  invalidateKeys: [queryKeys.users.all],
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
  },
  successMessage: 'Użytkownik został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować użytkownika',
});

export const useDeleteUser = createMutationHook<void, string>({
  mutationFn: (id) => usersApi.delete(id),
  invalidateKeys: [queryKeys.users.all],
  successMessage: 'Użytkownik został usunięty',
  errorMessage: 'Nie udało się usunąć użytkownika',
});

export function useAvailableCompanyOwners() {
  return useQuery({
    queryKey: queryKeys.companies.availableOwners,
    queryFn: usersApi.getAvailableOwners,
  });
}
