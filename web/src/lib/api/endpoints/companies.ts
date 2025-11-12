import apiClient from '../client';
import { CompanyDto, CreateCompanyDto, UpdateCompanyDto } from '@/types/dtos';

export const companiesApi = {
  getAll: async (): Promise<CompanyDto[]> => {
    const { data } = await apiClient.get<CompanyDto[]>('/api/admin/companies');
    return data;
  },

  getById: async (id: string): Promise<CompanyDto> => {
    const { data } = await apiClient.get<CompanyDto>(`/api/admin/companies/${id}`);
    return data;
  },

  create: async (companyData: CreateCompanyDto): Promise<CompanyDto> => {
    const { data } = await apiClient.post<CompanyDto>('/api/admin/companies', companyData);
    return data;
  },

  update: async (id: string, companyData: UpdateCompanyDto): Promise<CompanyDto> => {
    const { data } = await apiClient.patch<CompanyDto>(`/api/admin/companies/${id}`, companyData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/companies/${id}`);
  },
};

