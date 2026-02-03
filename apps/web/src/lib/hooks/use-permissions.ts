import { useMemo } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import { type ApiErrorResponse } from '@/types/api';
import { type GrantModuleAccessDto, type UpdateModulePermissionDto } from '@/types/dtos';
import { UserRole } from '@/types/enums';


import { permissionsApi } from '../api/endpoints/permissions';
import { queryKeys } from '../api/query-client';

/**
 * Permission constants matching backend RBAC system
 */
export const ModulePermission = {
  READ: 'READ',
  WRITE: 'WRITE',
  DELETE: 'DELETE',
} as const;

export type ModulePermissionType = (typeof ModulePermission)[keyof typeof ModulePermission];

/**
 * Hook to check current user's permissions for a specific module.
 * Centralizes RBAC logic to avoid hardcoding role checks throughout the app.
 *
 * Permission model (from module-description/client-module.md):
 * - ADMIN/COMPANY_OWNER: Full access (READ, WRITE, DELETE)
 * - EMPLOYEE: Limited access (READ, WRITE - DELETE requires owner approval)
 *
 * @param moduleSlug - The module identifier (e.g., 'clients')
 * @returns Object with permission flags and helper functions
 */

export function useModulePermissions(_moduleSlug: string) {
  const { user, isAuthenticated } = useAuthContext();

  return useMemo(() => {
    // Not authenticated - no permissions
    if (!isAuthenticated || !user) {
      return {
        hasReadPermission: false,
        hasWritePermission: false,
        hasDeletePermission: false,
        canRead: false,
        canWrite: false,
        canDelete: false,
        isAdmin: false,
        isOwner: false,
        isEmployee: false,
        checkPermission: (_permission: ModulePermissionType) => false,
      };
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = user.role === UserRole.COMPANY_OWNER;
    const isEmployee = user.role === UserRole.EMPLOYEE;

    // ADMIN and COMPANY_OWNER have full permissions
    // EMPLOYEE has READ and WRITE but NOT DELETE (per module specification)
    const hasReadPermission = isAdmin || isOwner || isEmployee;
    const hasWritePermission = isAdmin || isOwner || isEmployee;
    const hasDeletePermission = isAdmin || isOwner; // Employees cannot delete

    const checkPermission = (permission: ModulePermissionType): boolean => {
      switch (permission) {
        case ModulePermission.READ:
          return hasReadPermission;
        case ModulePermission.WRITE:
          return hasWritePermission;
        case ModulePermission.DELETE:
          return hasDeletePermission;
        default:
          return false;
      }
    };

    return {
      // Permission flags
      hasReadPermission,
      hasWritePermission,
      hasDeletePermission,
      // Aliases for semantic clarity
      canRead: hasReadPermission,
      canWrite: hasWritePermission,
      canDelete: hasDeletePermission,
      // Role flags for edge cases
      isAdmin,
      isOwner,
      isEmployee,
      // Helper function for dynamic permission checks
      checkPermission,
    };
  }, [user, isAuthenticated]);
}

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
    mutationFn: ({
      employeeId,
      moduleSlug,
      permissions,
    }: {
      employeeId: string;
      moduleSlug: string;
      permissions: GrantModuleAccessDto;
    }) => permissionsApi.grantModuleAccess(employeeId, moduleSlug, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.permissions.byEmployee(variables.employeeId),
      });
      toast({
        title: 'Sukces',
        description: 'Dostęp do modułu został przyznany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      let errorMessage = 'Nie udało się przyznać dostępu do modułu';

      // Provide specific error messages based on the error
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;

        // Check for specific error patterns
        if (errorMessage.includes('does not have access to this module')) {
          errorMessage =
            'Twoja firma nie ma dostępu do tego modułu. Skontaktuj się z administratorem, aby najpierw włączyć ten moduł dla firmy.';
        } else if (errorMessage.includes('Module not found')) {
          errorMessage = 'Wybrany moduł nie istnieje lub jest nieaktywny.';
        }
      }

      toast({
        title: 'Błąd',
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
    mutationFn: ({
      employeeId,
      moduleSlug,
      permissions,
    }: {
      employeeId: string;
      moduleSlug: string;
      permissions: UpdateModulePermissionDto;
    }) => permissionsApi.updateModulePermission(employeeId, moduleSlug, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.permissions.byEmployee(variables.employeeId),
      });
      toast({
        title: 'Sukces',
        description: 'Uprawnienia zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować uprawnień',
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.permissions.byEmployee(variables.employeeId),
      });
      toast({
        title: 'Sukces',
        description: 'Dostęp do modułu został cofnięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się cofnąć dostępu do modułu',
        variant: 'destructive',
      });
    },
  });
}
