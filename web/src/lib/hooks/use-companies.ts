import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../api/endpoints/companies';
import { queryKeys } from '../api/query-client';
import { CreateCompanyDto, UpdateCompanyDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

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
      toast({
        title: 'Success',
        description: 'Company created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create company',
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
        title: 'Success',
        description: 'Company updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update company',
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
        title: 'Success',
        description: 'Company deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete company',
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
      queryClient.invalidateQueries({ queryKey: [...queryKeys.companies.detail(variables.companyId), 'modules'] });
      toast({
        title: 'Success',
        description: 'Module enabled successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to enable module',
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
      queryClient.invalidateQueries({ queryKey: [...queryKeys.companies.detail(variables.companyId), 'modules'] });
      // Also invalidate employee permissions queries as they might have been cascaded
      queryClient.invalidateQueries({ queryKey: ['company', 'employees'] });
      toast({
        title: 'Success',
        description: 'Module access revoked. All employee permissions for this module have been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to disable module',
        variant: 'destructive',
      });
    },
  });
}

