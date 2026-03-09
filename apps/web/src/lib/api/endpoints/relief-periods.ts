import { ReliefType, ReliefTypeDurationMonths, ReliefTypeLabels } from '@/types/enums';

import apiClient from '../client';

// ============================================
// Types
// ============================================

export { ReliefType, ReliefTypeLabels, ReliefTypeDurationMonths };

export interface CreateReliefPeriodDto {
  reliefType: ReliefType;
  startDate: string;
  endDate?: string;
}

export interface UpdateReliefPeriodDto {
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface ReliefPeriodResponseDto {
  id: string;
  clientId: string;
  clientName: string;
  companyId: string;
  reliefType: ReliefType;
  reliefTypeLabel: string;
  startDate: string;
  endDate: string;
  daysUntilEnd: number | null;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API Functions
// ============================================

export const reliefPeriodsApi = {
  /**
   * Get all relief periods for a client
   */
  getAll: async (clientId: string): Promise<ReliefPeriodResponseDto[]> => {
    const response = await apiClient.get<ReliefPeriodResponseDto[]>(
      `/api/modules/clients/${clientId}/relief-periods`
    );
    return response.data;
  },

  /**
   * Get a specific relief period
   */
  getById: async (clientId: string, reliefId: string): Promise<ReliefPeriodResponseDto> => {
    const response = await apiClient.get<ReliefPeriodResponseDto>(
      `/api/modules/clients/${clientId}/relief-periods/${reliefId}`
    );
    return response.data;
  },

  /**
   * Create a new relief period
   */
  create: async (
    clientId: string,
    data: CreateReliefPeriodDto
  ): Promise<ReliefPeriodResponseDto> => {
    const response = await apiClient.post<ReliefPeriodResponseDto>(
      `/api/modules/clients/${clientId}/relief-periods`,
      data
    );
    return response.data;
  },

  /**
   * Update a relief period
   */
  update: async (
    clientId: string,
    reliefId: string,
    data: UpdateReliefPeriodDto
  ): Promise<ReliefPeriodResponseDto> => {
    const response = await apiClient.patch<ReliefPeriodResponseDto>(
      `/api/modules/clients/${clientId}/relief-periods/${reliefId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a relief period
   */
  delete: async (clientId: string, reliefId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/api/modules/clients/${clientId}/relief-periods/${reliefId}`
    );
    return response.data;
  },
};
