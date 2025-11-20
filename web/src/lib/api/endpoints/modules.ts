import apiClient from '../client';
import { ModuleDto, CreateModuleDto, UpdateModuleDto } from '@/types/dtos';

export const modulesApi = {
  /**
   * Get modules for current user (role-aware)
   * - ADMIN: all modules
   * - COMPANY_OWNER: company modules
   * - EMPLOYEE: permitted modules
   */
  getAll: async (): Promise<ModuleDto[]> => {
    const { data } = await apiClient.get<ModuleDto[]>('/api/modules');
    return data;
  },

  /**
   * Get module by ID or slug (role-aware)
   * Auto-detects UUID vs slug
   */
  getByIdentifier: async (identifier: string): Promise<ModuleDto> => {
    const { data } = await apiClient.get<ModuleDto>(`/api/modules/${identifier}`);
    return data;
  },

  /**
   * @deprecated Use getByIdentifier instead
   */
  getById: async (id: string): Promise<ModuleDto> => {
    const { data } = await apiClient.get<ModuleDto>(`/api/modules/${id}`);
    return data;
  },

  // Admin-only operations
  create: async (moduleData: CreateModuleDto): Promise<ModuleDto> => {
    const { data } = await apiClient.post<ModuleDto>('/api/modules', moduleData);
    return data;
  },

  update: async (id: string, moduleData: UpdateModuleDto): Promise<ModuleDto> => {
    const { data } = await apiClient.patch<ModuleDto>(`/api/modules/${id}`, moduleData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/modules/${id}`);
  },
};

