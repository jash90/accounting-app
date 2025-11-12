import apiClient from '../client';
import { UserDto, CreateUserDto, UpdateUserDto } from '@/types/dtos';

export const usersApi = {
  getAll: async (): Promise<UserDto[]> => {
    const { data } = await apiClient.get<UserDto[]>('/api/admin/users');
    return data;
  },

  getById: async (id: string): Promise<UserDto> => {
    const { data } = await apiClient.get<UserDto>(`/api/admin/users/${id}`);
    return data;
  },

  create: async (userData: CreateUserDto): Promise<UserDto> => {
    const { data } = await apiClient.post<UserDto>('/api/admin/users', userData);
    return data;
  },

  update: async (id: string, userData: UpdateUserDto): Promise<UserDto> => {
    const { data } = await apiClient.patch<UserDto>(`/api/admin/users/${id}`, userData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${id}`);
  },

  activate: async (id: string, isActive: boolean): Promise<UserDto> => {
    const { data } = await apiClient.patch<UserDto>(`/api/admin/users/${id}/activate`, { isActive });
    return data;
  },
};

