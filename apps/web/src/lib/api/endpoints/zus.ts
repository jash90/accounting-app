import type {
  CalculateZusContributionDto,
  CreateZusContributionDto,
  GenerateMonthlyContributionsDto,
  GenerateMonthlyResultDto,
  MarkPaidDto,
  PaginatedZusContributionsResponseDto,
  UpdateZusContributionDto,
  UpdateZusSettingsDto,
  ZusClientSettingsResponseDto,
  ZusContributionFiltersDto,
  ZusContributionResponseDto,
  ZusMonthlyComparisonDto,
  ZusRatesResponseDto,
  ZusStatisticsDto,
  ZusUpcomingPaymentDto,
} from '@/types/dtos';

import apiClient from '../client';

const BASE_URL = '/api/modules/zus';

/**
 * ZUS API endpoints
 */
export const zusApi = {
  // ============================================
  // Contributions
  // ============================================
  contributions: {
    /**
     * Get all contributions with pagination and filters
     */
    getAll: async (
      filters?: ZusContributionFiltersDto
    ): Promise<PaginatedZusContributionsResponseDto> => {
      const { data } = await apiClient.get<PaginatedZusContributionsResponseDto>(
        `${BASE_URL}/contributions`,
        { params: filters }
      );
      return data;
    },

    /**
     * Get contribution by ID
     */
    getById: async (id: string): Promise<ZusContributionResponseDto> => {
      const { data } = await apiClient.get<ZusContributionResponseDto>(
        `${BASE_URL}/contributions/${id}`
      );
      return data;
    },

    /**
     * Get contributions for a specific client
     */
    getByClient: async (clientId: string): Promise<ZusContributionResponseDto[]> => {
      const { data } = await apiClient.get<ZusContributionResponseDto[]>(
        `${BASE_URL}/contributions/client/${clientId}`
      );
      return data;
    },

    /**
     * Create a new contribution
     */
    create: async (dto: CreateZusContributionDto): Promise<ZusContributionResponseDto> => {
      const { data } = await apiClient.post<ZusContributionResponseDto>(
        `${BASE_URL}/contributions`,
        dto
      );
      return data;
    },

    /**
     * Calculate ZUS contributions for a client
     */
    calculate: async (dto: CalculateZusContributionDto): Promise<ZusContributionResponseDto> => {
      const { data } = await apiClient.post<ZusContributionResponseDto>(
        `${BASE_URL}/contributions/calculate`,
        dto
      );
      return data;
    },

    /**
     * Generate monthly contributions for all clients with ZUS settings
     */
    generateMonthly: async (
      dto: GenerateMonthlyContributionsDto
    ): Promise<GenerateMonthlyResultDto> => {
      const { data } = await apiClient.post<GenerateMonthlyResultDto>(
        `${BASE_URL}/contributions/generate-monthly`,
        dto
      );
      return data;
    },

    /**
     * Update a contribution
     */
    update: async (
      id: string,
      dto: UpdateZusContributionDto
    ): Promise<ZusContributionResponseDto> => {
      const { data } = await apiClient.patch<ZusContributionResponseDto>(
        `${BASE_URL}/contributions/${id}`,
        dto
      );
      return data;
    },

    /**
     * Mark contribution as paid
     */
    markPaid: async (id: string, dto: MarkPaidDto): Promise<ZusContributionResponseDto> => {
      const { data } = await apiClient.patch<ZusContributionResponseDto>(
        `${BASE_URL}/contributions/${id}/mark-paid`,
        dto
      );
      return data;
    },

    /**
     * Delete a contribution
     */
    delete: async (id: string): Promise<void> => {
      await apiClient.delete(`${BASE_URL}/contributions/${id}`);
    },

    /**
     * Export contributions to CSV
     */
    exportCsv: async (filters?: ZusContributionFiltersDto): Promise<Blob> => {
      const { data } = await apiClient.get(`${BASE_URL}/contributions/export/csv`, {
        params: filters,
        responseType: 'blob',
      });
      return data;
    },
  },

  // ============================================
  // Settings
  // ============================================
  settings: {
    /**
     * Get ZUS settings for a client
     */
    getForClient: async (clientId: string): Promise<ZusClientSettingsResponseDto | null> => {
      try {
        const { data } = await apiClient.get<ZusClientSettingsResponseDto>(
          `${BASE_URL}/settings/client/${clientId}`
        );
        return data;
      } catch (error) {
        // Return null if settings don't exist
        if ((error as { response?: { status?: number } }).response?.status === 404) {
          return null;
        }
        throw error;
      }
    },

    /**
     * Create or update ZUS settings for a client
     */
    updateForClient: async (
      clientId: string,
      dto: UpdateZusSettingsDto
    ): Promise<ZusClientSettingsResponseDto> => {
      const { data } = await apiClient.put<ZusClientSettingsResponseDto>(
        `${BASE_URL}/settings/client/${clientId}`,
        dto
      );
      return data;
    },

    /**
     * Delete ZUS settings for a client
     */
    deleteForClient: async (clientId: string): Promise<void> => {
      await apiClient.delete(`${BASE_URL}/settings/client/${clientId}`);
    },

    /**
     * Get current ZUS rates
     */
    getCurrentRates: async (): Promise<ZusRatesResponseDto> => {
      const { data } = await apiClient.get<ZusRatesResponseDto>(`${BASE_URL}/settings/rates`);
      return data;
    },
  },

  // ============================================
  // Dashboard
  // ============================================
  dashboard: {
    /**
     * Get ZUS dashboard statistics
     */
    getStatistics: async (): Promise<ZusStatisticsDto> => {
      const { data } = await apiClient.get<ZusStatisticsDto>(`${BASE_URL}/dashboard/statistics`);
      return data;
    },

    /**
     * Get upcoming ZUS payments
     */
    getUpcoming: async (days: number = 30): Promise<ZusUpcomingPaymentDto[]> => {
      const { data } = await apiClient.get<ZusUpcomingPaymentDto[]>(
        `${BASE_URL}/dashboard/upcoming`,
        { params: { days } }
      );
      return data;
    },

    /**
     * Get monthly ZUS comparison
     */
    getComparison: async (months: number = 6): Promise<ZusMonthlyComparisonDto[]> => {
      const { data } = await apiClient.get<ZusMonthlyComparisonDto[]>(
        `${BASE_URL}/dashboard/comparison`,
        { params: { months } }
      );
      return data;
    },
  },
};
