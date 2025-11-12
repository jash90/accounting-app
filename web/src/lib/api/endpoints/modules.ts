import apiClient from '../client';
import { ModuleDto, CreateModuleDto, UpdateModuleDto } from '@/types/dtos';

export const modulesApi = {
  getAll: async (): Promise<ModuleDto[]> => {
    const { data } = await apiClient.get<ModuleDto[]>('/api/admin/modules');
    return data;
  },

  getById: async (id: string): Promise<ModuleDto> => {
    const { data } = await apiClient.get<ModuleDto>(`/api/admin/modules/${id}`);
    return data;
  },

  create: async (moduleData: CreateModuleDto): Promise<ModuleDto> => {
    const { data } = await apiClient.post<ModuleDto>('/api/admin/modules', moduleData);
    return data;
  },

  update: async (id: string, moduleData: UpdateModuleDto): Promise<ModuleDto> => {
    const { data } = await apiClient.patch<ModuleDto>(`/api/admin/modules/${id}`, moduleData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/modules/${id}`);
  },
};

