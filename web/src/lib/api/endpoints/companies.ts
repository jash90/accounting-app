import apiClient from '../client';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  ManageModulePermissionDto,
  PermissionTargetType,
} from '@/types/dtos';
import { CompanyModuleAccess } from '@/types/entities';

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

  // Company Module Access Management
  getCompanyModules: async (companyId: string): Promise<CompanyModuleAccess[]> => {
    const { data } = await apiClient.get<CompanyModuleAccess[]>(`/api/modules/companies/${companyId}`);
    return data;
  },

  grantModuleToCompany: async (companyId: string, moduleSlug: string): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.COMPANY,
      targetId: companyId,
      moduleSlug,
    };
    await apiClient.post('/api/modules/permissions', dto);
  },

  revokeModuleFromCompany: async (companyId: string, moduleSlug: string): Promise<void> => {
    const dto: ManageModulePermissionDto = {
      targetType: PermissionTargetType.COMPANY,
      targetId: companyId,
      moduleSlug,
    };
    await apiClient.delete('/api/modules/permissions', { data: dto });
  },
};

