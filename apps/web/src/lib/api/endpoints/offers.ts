import { type PaginatedResponse } from '@/types/api';
import {
  type ContentBlocksResponseDto,
  type ConvertLeadToClientDto,
  type CreateLeadDto,
  type CreateOfferDto,
  type CreateOfferTemplateDto,
  type DuplicateOfferDto,
  type LeadFiltersDto,
  type LeadResponseDto,
  type LeadStatisticsDto,
  type OfferActivityResponseDto,
  type OfferFiltersDto,
  type OfferResponseDto,
  type OfferStatisticsDto,
  type OfferTemplateFiltersDto,
  type OfferTemplateResponseDto,
  type SendOfferDto,
  type StandardPlaceholdersResponseDto,
  type UpdateContentBlocksDto,
  type UpdateLeadDto,
  type UpdateOfferDto,
  type UpdateOfferStatusDto,
  type UpdateOfferTemplateDto,
} from '@/types/dtos';

import apiClient from '../client';

const BASE_URL = '/api/modules/offers';

// ============================================
// Offers API
// ============================================

export const offersApi = {
  getAll: async (filters?: OfferFiltersDto): Promise<PaginatedResponse<OfferResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<OfferResponseDto>>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<OfferResponseDto> => {
    const { data } = await apiClient.get<OfferResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  create: async (offerData: CreateOfferDto): Promise<OfferResponseDto> => {
    const { data } = await apiClient.post<OfferResponseDto>(BASE_URL, offerData);
    return data;
  },

  update: async (id: string, offerData: UpdateOfferDto): Promise<OfferResponseDto> => {
    const { data } = await apiClient.patch<OfferResponseDto>(`${BASE_URL}/${id}`, offerData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  updateStatus: async (id: string, statusData: UpdateOfferStatusDto): Promise<OfferResponseDto> => {
    const { data } = await apiClient.patch<OfferResponseDto>(
      `${BASE_URL}/${id}/status`,
      statusData
    );
    return data;
  },

  generateDocument: async (id: string): Promise<OfferResponseDto> => {
    const { data } = await apiClient.post<OfferResponseDto>(`${BASE_URL}/${id}/generate-document`);
    return data;
  },

  downloadDocument: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE_URL}/${id}/download-document`, {
      responseType: 'blob',
    });
    return data;
  },

  sendEmail: async (id: string, sendData: SendOfferDto): Promise<OfferResponseDto> => {
    const { data } = await apiClient.post<OfferResponseDto>(`${BASE_URL}/${id}/send`, sendData);
    return data;
  },

  duplicate: async (id: string, duplicateData?: DuplicateOfferDto): Promise<OfferResponseDto> => {
    const { data } = await apiClient.post<OfferResponseDto>(
      `${BASE_URL}/${id}/duplicate`,
      duplicateData || {}
    );
    return data;
  },

  getActivities: async (id: string): Promise<OfferActivityResponseDto[]> => {
    const { data } = await apiClient.get<OfferActivityResponseDto[]>(
      `${BASE_URL}/${id}/activities`
    );
    return data;
  },

  getStatistics: async (): Promise<OfferStatisticsDto> => {
    const { data } = await apiClient.get<OfferStatisticsDto>(`${BASE_URL}/statistics`);
    return data;
  },

  getStandardPlaceholders: async (): Promise<StandardPlaceholdersResponseDto> => {
    const { data } = await apiClient.get<StandardPlaceholdersResponseDto>(
      `${BASE_URL}/placeholders`
    );
    return data;
  },
};

// ============================================
// Leads API
// ============================================

const LEADS_URL = `${BASE_URL}/leads`;

export interface LeadAssigneeDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const leadsApi = {
  getAll: async (filters?: LeadFiltersDto): Promise<PaginatedResponse<LeadResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<LeadResponseDto>>(LEADS_URL, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<LeadResponseDto> => {
    const { data } = await apiClient.get<LeadResponseDto>(`${LEADS_URL}/${id}`);
    return data;
  },

  create: async (leadData: CreateLeadDto): Promise<LeadResponseDto> => {
    const { data } = await apiClient.post<LeadResponseDto>(LEADS_URL, leadData);
    return data;
  },

  update: async (id: string, leadData: UpdateLeadDto): Promise<LeadResponseDto> => {
    const { data } = await apiClient.patch<LeadResponseDto>(`${LEADS_URL}/${id}`, leadData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${LEADS_URL}/${id}`);
  },

  convertToClient: async (
    id: string,
    convertData?: ConvertLeadToClientDto
  ): Promise<{ clientId: string; message: string }> => {
    const { data } = await apiClient.post<{ clientId: string; message: string }>(
      `${LEADS_URL}/${id}/convert`,
      convertData || {}
    );
    return data;
  },

  getStatistics: async (): Promise<LeadStatisticsDto> => {
    const { data } = await apiClient.get<LeadStatisticsDto>(`${LEADS_URL}/statistics`);
    return data;
  },

  getAssignees: async (): Promise<LeadAssigneeDto[]> => {
    const { data } = await apiClient.get<LeadAssigneeDto[]>(`${LEADS_URL}/lookup/assignees`);
    return data;
  },
};

// ============================================
// Offer Templates API
// ============================================

const TEMPLATES_URL = `${BASE_URL}/templates`;

export const offerTemplatesApi = {
  getAll: async (
    filters?: OfferTemplateFiltersDto
  ): Promise<PaginatedResponse<OfferTemplateResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<OfferTemplateResponseDto>>(
      TEMPLATES_URL,
      { params: filters }
    );
    return data;
  },

  getById: async (id: string): Promise<OfferTemplateResponseDto> => {
    const { data } = await apiClient.get<OfferTemplateResponseDto>(`${TEMPLATES_URL}/${id}`);
    return data;
  },

  getDefault: async (): Promise<OfferTemplateResponseDto | null> => {
    try {
      const { data } = await apiClient.get<OfferTemplateResponseDto>(`${TEMPLATES_URL}/default`);
      return data;
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 404) return null;
      throw error;
    }
  },

  create: async (templateData: CreateOfferTemplateDto): Promise<OfferTemplateResponseDto> => {
    const { data } = await apiClient.post<OfferTemplateResponseDto>(TEMPLATES_URL, templateData);
    return data;
  },

  update: async (
    id: string,
    templateData: UpdateOfferTemplateDto
  ): Promise<OfferTemplateResponseDto> => {
    const { data } = await apiClient.patch<OfferTemplateResponseDto>(
      `${TEMPLATES_URL}/${id}`,
      templateData
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${TEMPLATES_URL}/${id}`);
  },

  uploadTemplate: async (id: string, file: File): Promise<OfferTemplateResponseDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<OfferTemplateResponseDto>(
      `${TEMPLATES_URL}/${id}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  downloadTemplate: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${TEMPLATES_URL}/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  getContentBlocks: async (id: string): Promise<ContentBlocksResponseDto> => {
    const { data } = await apiClient.get<ContentBlocksResponseDto>(
      `${TEMPLATES_URL}/${id}/content-blocks`
    );
    return data;
  },

  updateContentBlocks: async (
    id: string,
    payload: UpdateContentBlocksDto
  ): Promise<OfferTemplateResponseDto> => {
    const { data } = await apiClient.patch<OfferTemplateResponseDto>(
      `${TEMPLATES_URL}/${id}/content-blocks`,
      payload
    );
    return data;
  },
};
