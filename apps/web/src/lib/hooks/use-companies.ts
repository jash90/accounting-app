import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import { type CreateCompanyDto, type UpdateCompanyDto } from '@/types/dtos';

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

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (companyData: CreateCompanyDto) => companiesApi.create(companyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      // Invalidate available owners as the selected owner is now assigned
      queryClient.invalidateQueries({ queryKey: ['available-owners'] });
      toast({
        title: 'Sukces',
        description: 'Firma została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć firmy',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyDto }) =>
      companiesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Firma została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować firmy',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast({
        title: 'Sukces',
        description: 'Firma została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć firmy',
        variant: 'destructive',
      });
    },
  });
}

// Company Module Access Hooks
export function useCompanyModules(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.companies.detail(companyId), 'modules'],
    queryFn: () => companiesApi.getCompanyModules(companyId),
    enabled: !!companyId,
  });
}

export function useGrantModuleToCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, moduleSlug }: { companyId: string; moduleSlug: string }) =>
      companiesApi.grantModuleToCompany(companyId, moduleSlug),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.companies.detail(variables.companyId), 'modules'],
      });
      toast({
        title: 'Sukces',
        description: 'Moduł został włączony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się włączyć modułu',
        variant: 'destructive',
      });
    },
  });
}

export function useRevokeModuleFromCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, moduleSlug }: { companyId: string; moduleSlug: string }) =>
      companiesApi.revokeModuleFromCompany(companyId, moduleSlug),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.companies.detail(variables.companyId), 'modules'],
      });
      // Also invalidate employee permissions queries as they might have been cascaded
      queryClient.invalidateQueries({ queryKey: ['company', 'employees'] });
      toast({
        title: 'Sukces',
        description:
          'Dostęp do modułu został cofnięty. Wszystkie uprawnienia pracowników dla tego modułu zostały usunięte.',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wyłączyć modułu',
        variant: 'destructive',
      });
    },
  });
}
