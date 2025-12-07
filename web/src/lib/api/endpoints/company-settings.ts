import apiClient from '../client';

export interface CompanySettingsDto {
  id: string;
  name: string;
  notificationFromEmail?: string;
}

export interface UpdateCompanySettingsDto {
  notificationFromEmail?: string;
}

export const companySettingsApi = {
  get: async (): Promise<CompanySettingsDto> => {
    const { data } = await apiClient.get<CompanySettingsDto>('/api/company/settings');
    return data;
  },

  update: async (settingsData: UpdateCompanySettingsDto): Promise<CompanySettingsDto> => {
    const { data } = await apiClient.patch<CompanySettingsDto>('/api/company/settings', settingsData);
    return data;
  },
};
