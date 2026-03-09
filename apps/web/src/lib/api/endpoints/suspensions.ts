import apiClient from '../client';

// ============================================
// Types
// ============================================

export interface CreateSuspensionDto {
  startDate: string;
  endDate?: string;
  reason?: string;
}

export interface UpdateSuspensionDto {
  endDate?: string;
  reason?: string;
}

export interface SuspensionResponseDto {
  id: string;
  clientId: string;
  clientName: string;
  companyId: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  createdById: string;
  createdByName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API Functions
// ============================================

export const suspensionsApi = {
  /**
   * Get all suspensions for a client
   */
  getAll: async (clientId: string): Promise<SuspensionResponseDto[]> => {
    const response = await apiClient.get<SuspensionResponseDto[]>(
      `/api/modules/clients/${clientId}/suspensions`
    );
    return response.data;
  },

  /**
   * Get a specific suspension
   */
  getById: async (clientId: string, suspensionId: string): Promise<SuspensionResponseDto> => {
    const response = await apiClient.get<SuspensionResponseDto>(
      `/api/modules/clients/${clientId}/suspensions/${suspensionId}`
    );
    return response.data;
  },

  /**
   * Create a new suspension
   */
  create: async (clientId: string, data: CreateSuspensionDto): Promise<SuspensionResponseDto> => {
    const response = await apiClient.post<SuspensionResponseDto>(
      `/api/modules/clients/${clientId}/suspensions`,
      data
    );
    return response.data;
  },

  /**
   * Update a suspension (e.g., set end date)
   */
  update: async (
    clientId: string,
    suspensionId: string,
    data: UpdateSuspensionDto
  ): Promise<SuspensionResponseDto> => {
    const response = await apiClient.patch<SuspensionResponseDto>(
      `/api/modules/clients/${clientId}/suspensions/${suspensionId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a suspension
   */
  delete: async (clientId: string, suspensionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/api/modules/clients/${clientId}/suspensions/${suspensionId}`
    );
    return response.data;
  },
};
