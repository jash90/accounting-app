import { useQuery } from '@tanstack/react-query';

import { type CreateCompanyDto, type UpdateCompanyDto } from '@/types/dtos';

import { createMutationHook } from './create-mutation-hook';
import { companiesApi } from '../api/endpoints/companies';
import { queryKeys } from '../api/query-client';

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: companiesApi.getAll,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
  });
}

export const useCreateCompany = createMutationHook<void, CreateCompanyDto>({
  mutationFn: (data) => companiesApi.create(data),
  invalidateKeys: [queryKeys.companies.all],
  onSuccess: (_, __, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.availableOwners });
  },
  successMessage: 'Firma została utworzona',
  errorMessage: 'Nie udało się utworzyć firmy',
});

export const useUpdateCompany = createMutationHook<void, { id: string; data: UpdateCompanyDto }>({
  mutationFn: ({ id, data }) => companiesApi.update(id, data),
  invalidateKeys: [queryKeys.companies.all],
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.id) });
  },
  successMessage: 'Firma została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować firmy',
});

export const useDeleteCompany = createMutationHook<void, string>({
  mutationFn: (id) => companiesApi.delete(id),
  invalidateKeys: [queryKeys.companies.all],
  successMessage: 'Firma została usunięta',
  errorMessage: 'Nie udało się usunąć firmy',
});

// Company Module Access Hooks
export function useCompanyAssignedModules(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.modules(companyId),
    queryFn: () => companiesApi.getCompanyModules(companyId),
    enabled: !!companyId,
  });
}

export const useGrantModuleToCompany = createMutationHook<
  void,
  { companyId: string; moduleSlug: string }
>({
  mutationFn: ({ companyId, moduleSlug }) =>
    companiesApi.grantModuleToCompany(companyId, moduleSlug),
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.companies.modules(variables.companyId),
    });
  },
  successMessage: 'Moduł został włączony',
  errorMessage: 'Nie udało się włączyć modułu',
});

export const useRevokeModuleFromCompany = createMutationHook<
  void,
  { companyId: string; moduleSlug: string }
>({
  mutationFn: ({ companyId, moduleSlug }) =>
    companiesApi.revokeModuleFromCompany(companyId, moduleSlug),
  onSuccess: (_, variables, queryClient) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.companies.modules(variables.companyId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.companyEmployees });
  },
  successMessage:
    'Dostęp do modułu został cofnięty. Wszystkie uprawnienia pracowników dla tego modułu zostały usunięte.',
  errorMessage: 'Nie udało się wyłączyć modułu',
});
