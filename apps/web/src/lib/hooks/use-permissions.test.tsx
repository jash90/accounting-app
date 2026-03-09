import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';

import {
  ModulePermission,
  useCompanyPermissionModules,
  useEmployeeModulePermissions,
  useGrantModuleAccess,
  useModulePermissions,
  useRevokeModuleAccess,
} from './use-permissions';
import { permissionsApi } from '../api/endpoints/permissions';

// Mock the API modules
vi.mock('../api/endpoints/permissions');
vi.mock('@/components/ui/use-toast');
vi.mock('@/contexts/auth-context');

const mockToast = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockModules = [
  { id: 'mod-1', name: 'Clients', slug: 'clients', isActive: true },
  { id: 'mod-2', name: 'Tasks', slug: 'tasks', isActive: true },
];

const mockEmployeePermissions = [
  { moduleSlug: 'clients', canRead: true, canWrite: true, canDelete: false },
];

describe('use-permissions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // useModulePermissions (role-based, no API)
  // ========================================

  describe('useModulePermissions', () => {
    it('should return full permissions for ADMIN', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.ADMIN },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useModulePermissions('clients'));

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canManage).toBe(true);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOwner).toBe(false);
    });

    it('should return full permissions for COMPANY_OWNER', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useModulePermissions('clients'));

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canManage).toBe(true);
      expect(result.current.isOwner).toBe(true);
    });

    it('should return limited permissions for EMPLOYEE', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.EMPLOYEE },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useModulePermissions('clients'));

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(true);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManage).toBe(false);
      expect(result.current.isEmployee).toBe(true);
    });

    it('should return no permissions when not authenticated', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useModulePermissions('clients'));

      expect(result.current.canRead).toBe(false);
      expect(result.current.canWrite).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManage).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });

    it('should support checkPermission helper', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.EMPLOYEE },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useModulePermissions('clients'));

      expect(result.current.checkPermission(ModulePermission.READ)).toBe(true);
      expect(result.current.checkPermission(ModulePermission.WRITE)).toBe(true);
      expect(result.current.checkPermission(ModulePermission.DELETE)).toBe(false);
    });
  });

  // ========================================
  // Query Hooks
  // ========================================

  describe('useCompanyPermissionModules', () => {
    it('should fetch company modules', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);
      vi.mocked(permissionsApi.getCompanyModules).mockResolvedValue(mockModules as any);

      const { result } = renderHook(() => useCompanyPermissionModules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockModules);
    });
  });

  describe('useEmployeeModulePermissions', () => {
    it('should fetch employee module permissions', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);
      vi.mocked(permissionsApi.getEmployeeModules).mockResolvedValue(
        mockEmployeePermissions as any
      );

      const { result } = renderHook(() => useEmployeeModulePermissions('emp-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmployeePermissions);
      expect(permissionsApi.getEmployeeModules).toHaveBeenCalledWith('emp-123');
    });

    it('should not fetch when employeeId is empty', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);

      const { result } = renderHook(() => useEmployeeModulePermissions(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(permissionsApi.getEmployeeModules).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Mutation Hooks
  // ========================================

  describe('useGrantModuleAccess', () => {
    it('should grant module access and show success toast', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);
      vi.mocked(permissionsApi.grantModuleAccess).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useGrantModuleAccess(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          employeeId: 'emp-123',
          moduleSlug: 'clients',
          permissions: { canRead: true, canWrite: true } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(permissionsApi.grantModuleAccess).toHaveBeenCalledWith('emp-123', 'clients', {
        canRead: true,
        canWrite: true,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show specific error for company module access issue', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);
      vi.mocked(permissionsApi.grantModuleAccess).mockRejectedValue({
        response: { data: { message: 'Company does not have access to this module' } },
      });

      const { result } = renderHook(() => useGrantModuleAccess(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          employeeId: 'emp-123',
          moduleSlug: 'clients',
          permissions: { canRead: true } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useRevokeModuleAccess', () => {
    it('should revoke module access and show success toast', async () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { id: 'user-1', role: UserRole.COMPANY_OWNER },
        isAuthenticated: true,
      } as any);
      vi.mocked(permissionsApi.revokeModuleAccess).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useRevokeModuleAccess(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ employeeId: 'emp-123', moduleSlug: 'clients' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(permissionsApi.revokeModuleAccess).toHaveBeenCalledWith('emp-123', 'clients');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });
});
