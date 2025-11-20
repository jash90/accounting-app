import apiClient from '../client';
import {
  ManageModulePermissionDto,
  PermissionTargetType,
  UserModulePermission,
  ModuleDto,
} from '@/types/dtos';

export const permissionsApi = {
  /**
   * Get modules for current company owner
   * Uses unified GET /modules endpoint (role-aware)
   */
  getCompanyModules: async (): Promise<ModuleDto[]> => {
    const { data } = await apiClient.get<ModuleDto[]>('/api/modules');
    return data;
  },

  /**
   * Get modules for specific employee (Company Owner only)
   * Uses GET /modules/employee/:employeeId endpoint
   */
  getEmployeeModules: async (employeeId: string): Promise<UserModulePermission[]> => {
    const { data } = await apiClient.get<UserModulePermission[]>(`/api/modules/employee/${employeeId}`);
    return data;
  },

  /**
   * Grant module access to employee
   * Uses unified POST /modules/permissions endpoint
   */
  grantModuleAccess: async (
    employeeId: string,
    moduleSlug: string,
    permissions: { permissions: string[] }
  ): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.EMPLOYEE,
      targetId: employeeId,
      moduleSlug,
      permissions: permissions.permissions,
    };
    await apiClient.post('/api/modules/permissions', dto);
  },

  /**
   * Update employee module permissions
   * Uses unified PATCH /modules/permissions endpoint
   */
  updateModulePermission: async (
    employeeId: string,
    moduleSlug: string,
    permissions: { permissions: string[] }
  ): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.EMPLOYEE,
      targetId: employeeId,
      moduleSlug,
      permissions: permissions.permissions,
    };
    await apiClient.patch('/api/modules/permissions', dto);
  },

  /**
   * Revoke module access from employee
   * Uses unified DELETE /modules/permissions endpoint
   */
  revokeModuleAccess: async (employeeId: string, moduleSlug: string): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.EMPLOYEE,
      targetId: employeeId,
      moduleSlug,
    };
    await apiClient.delete('/api/modules/permissions', { data: dto });
  },

  /**
   * Grant module access to company (Admin only)
   */
  grantModuleToCompany: async (
    companyId: string,
    moduleSlug: string
  ): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.COMPANY,
      targetId: companyId,
      moduleSlug,
      permissions: [], // Not required for company access
    };
    await apiClient.post('/api/modules/permissions', dto);
  },

  /**
   * Revoke module access from company (Admin only)
   */
  revokeModuleFromCompany: async (companyId: string, moduleSlug: string): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.COMPANY,
      targetId: companyId,
      moduleSlug,
    };
    await apiClient.delete('/api/modules/permissions', { data: dto });
  },
};

