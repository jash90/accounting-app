import apiClient from '../client';
import { AdminContextDto, SwitchContextDto } from '@/types/dtos';

export const adminContextApi = {
  /**
   * Get current admin context and available contexts to switch to
   */
  getContext: async (): Promise<AdminContextDto> => {
    const { data } = await apiClient.get<AdminContextDto>('/api/admin/context');
    return data;
  },

  /**
   * Switch admin's active company context
   */
  switchContext: async (dto: SwitchContextDto): Promise<AdminContextDto> => {
    const { data } = await apiClient.post<AdminContextDto>(
      '/api/admin/context/switch',
      dto
    );
    return data;
  },

  /**
   * Reset admin's context back to System Admin (default)
   */
  resetContext: async (): Promise<AdminContextDto> => {
    const { data } = await apiClient.post<AdminContextDto>(
      '/api/admin/context/reset'
    );
    return data;
  },
};
