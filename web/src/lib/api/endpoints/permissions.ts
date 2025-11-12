import apiClient from '../client';
import { GrantModuleAccessDto, UpdateModulePermissionDto, UserModulePermission, ModuleDto } from '@/types/dtos';

export const permissionsApi = {
  getCompanyModules: async (): Promise<ModuleDto[]> => {
    const { data } = await apiClient.get<ModuleDto[]>('/api/company/modules');
    return data;
  },

  getEmployeeModules: async (employeeId: string): Promise<UserModulePermission[]> => {
    const { data } = await apiClient.get<UserModulePermission[]>(`/api/company/employees/${employeeId}/modules`);
    return data;
  },

  grantModuleAccess: async (employeeId: string, moduleSlug: string, permissions: GrantModuleAccessDto): Promise<void> => {
    await apiClient.post(`/api/company/employees/${employeeId}/modules/${moduleSlug}`, permissions);
  },

  updateModulePermission: async (employeeId: string, moduleSlug: string, permissions: UpdateModulePermissionDto): Promise<void> => {
    await apiClient.patch(`/api/company/employees/${employeeId}/modules/${moduleSlug}`, permissions);
  },

  revokeModuleAccess: async (employeeId: string, moduleSlug: string): Promise<void> => {
    await apiClient.delete(`/api/company/employees/${employeeId}/modules/${moduleSlug}`);
  },
};

