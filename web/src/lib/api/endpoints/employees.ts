import apiClient from '../client';
import { CreateEmployeeDto, UpdateEmployeeDto, UserDto } from '@/types/dtos';

export const employeesApi = {
  getAll: async (): Promise<UserDto[]> => {
    const { data } = await apiClient.get<UserDto[]>('/api/company/employees');
    return data;
  },

  getById: async (id: string): Promise<UserDto> => {
    const { data } = await apiClient.get<UserDto>(`/api/company/employees/${id}`);
    return data;
  },

  create: async (employeeData: CreateEmployeeDto): Promise<UserDto> => {
    const { data } = await apiClient.post<UserDto>('/api/company/employees', employeeData);
    return data;
  },

  update: async (id: string, employeeData: UpdateEmployeeDto): Promise<UserDto> => {
    const { data } = await apiClient.patch<UserDto>(`/api/company/employees/${id}`, employeeData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/company/employees/${id}`);
  },
};

