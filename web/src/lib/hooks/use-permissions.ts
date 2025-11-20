import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../api/endpoints/permissions';
import { queryKeys } from '../api/query-client';
import { GrantModuleAccessDto, UpdateModulePermissionDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

export function useCompanyModules() {
  return useQuery({
    queryKey: ['company', 'modules'],
    queryFn: permissionsApi.getCompanyModules,
  });
}

export function useEmployeeModules(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.permissions.byEmployee(employeeId),
    queryFn: () => permissionsApi.getEmployeeModules(employeeId),
    enabled: !!employeeId,
  });
}

export function useGrantModuleAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ employeeId, moduleSlug, permissions }: { employeeId: string; moduleSlug: string; permissions: GrantModuleAccessDto }) =>
      permissionsApi.grantModuleAccess(employeeId, moduleSlug, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.byEmployee(variables.employeeId) });
      toast({
        title: 'Success',
        description: 'Module access granted successfully',
      });
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to grant module access';

      // Provide specific error messages based on the error
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;

        // Check for specific error patterns
        if (errorMessage.includes('does not have access to this module')) {
          errorMessage = 'Your company does not have access to this module. Please contact your administrator to enable this module for your company first.';
        } else if (errorMessage.includes('Module not found')) {
          errorMessage = 'The selected module does not exist or is not active.';
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateModulePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ employeeId, moduleSlug, permissions }: { employeeId: string; moduleSlug: string; permissions: UpdateModulePermissionDto }) =>
      permissionsApi.updateModulePermission(employeeId, moduleSlug, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.byEmployee(variables.employeeId) });
      toast({
        title: 'Success',
        description: 'Permissions updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update permissions',
        variant: 'destructive',
      });
    },
  });
}

export function useRevokeModuleAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ employeeId, moduleSlug }: { employeeId: string; moduleSlug: string }) =>
      permissionsApi.revokeModuleAccess(employeeId, moduleSlug),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.byEmployee(variables.employeeId) });
      toast({
        title: 'Success',
        description: 'Module access revoked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to revoke module access',
        variant: 'destructive',
      });
    },
  });
}

