import apiClient from '../client';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientFiltersDto,
  ClientResponseDto,
  SetCustomFieldValuesDto,
  CreateClientFieldDefinitionDto,
  UpdateClientFieldDefinitionDto,
  ClientFieldDefinitionResponseDto,
  CreateClientIconDto,
  UpdateClientIconDto,
  ClientIconResponseDto,
  CreateNotificationSettingsDto,
  UpdateNotificationSettingsDto,
  NotificationSettingsResponseDto,
  ChangeLogResponseDto,
} from '@/types/dtos';
import { PaginatedResponse } from '@/types/api';
import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
} from '@/types/enums';

// ============================================
// Bulk Operations Types
// ============================================

export interface BulkDeleteClientsDto {
  clientIds: string[];
}

export interface BulkRestoreClientsDto {
  clientIds: string[];
}

export interface BulkEditClientsDto {
  clientIds: string[];
  employmentType?: EmploymentType;
  vatStatus?: VatStatus;
  taxScheme?: TaxScheme;
  zusStatus?: ZusStatus;
}

export interface BulkOperationResultDto {
  affected: number;
  message: string;
}

// ============================================
// Duplicate Detection Types
// ============================================

export interface CheckDuplicatesDto {
  nip?: string;
  email?: string;
  excludeId?: string;
}

export interface DuplicateClientInfo {
  id: string;
  name: string;
  nip?: string;
  email?: string;
  isActive: boolean;
}

export interface DuplicateCheckResultDto {
  hasDuplicates: boolean;
  byNip: DuplicateClientInfo[];
  byEmail: DuplicateClientInfo[];
}

// ============================================
// Statistics Types
// ============================================

export interface RecentClientDto {
  id: string;
  name: string;
  nip?: string;
  email?: string;
  employmentType?: EmploymentType;
  createdAt: string;
}

export interface RecentActivityDto {
  id: string;
  entityId: string;
  action: string;
  entityName: string;
  changedByName?: string;
  createdAt: string;
}

export interface ClientStatisticsDto {
  total: number;
  active: number;
  inactive: number;
  byEmploymentType: Record<EmploymentType, number>;
  byVatStatus: Record<VatStatus, number>;
  byTaxScheme: Record<TaxScheme, number>;
  byZusStatus: Record<ZusStatus, number>;
  addedThisMonth: number;
  addedLast30Days: number;
  recentlyAdded?: RecentClientDto[];
  recentActivity?: RecentActivityDto[];
}

// ============================================
// Import Types
// ============================================

export interface ImportResultDto {
  imported: number;
  updated: number;
  errors: { row: number; field: string; message: string }[];
}

const BASE_URL = '/api/modules/clients';

// Helper function to convert custom field filters to query params
function buildCustomFieldParams(filters?: ClientFiltersDto): Record<string, string | undefined> {
  if (!filters) return {};

  const { customFieldFilters, ...rest } = filters;
  const params: Record<string, string | undefined> = { ...rest } as Record<string, string | undefined>;

  // Convert customFieldFilters to customField_[fieldId]=operator:value format
  if (customFieldFilters && customFieldFilters.length > 0) {
    customFieldFilters.forEach((filter) => {
      const value = Array.isArray(filter.value)
        ? filter.value.join(',')
        : filter.value;
      params[`customField_${filter.fieldId}`] = `${filter.operator}:${value}`;
    });
  }

  return params;
}

// Client API
export const clientsApi = {
  getAll: async (filters?: ClientFiltersDto): Promise<PaginatedResponse<ClientResponseDto>> => {
    const params = buildCustomFieldParams(filters);
    const { data } = await apiClient.get<PaginatedResponse<ClientResponseDto>>(BASE_URL, {
      params,
    });
    return data;
  },

  getById: async (id: string): Promise<ClientResponseDto> => {
    const { data } = await apiClient.get<ClientResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  create: async (clientData: CreateClientDto): Promise<ClientResponseDto> => {
    const { data } = await apiClient.post<ClientResponseDto>(BASE_URL, clientData);
    return data;
  },

  update: async (id: string, clientData: UpdateClientDto): Promise<ClientResponseDto> => {
    const { data } = await apiClient.patch<ClientResponseDto>(`${BASE_URL}/${id}`, clientData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  restore: async (id: string): Promise<ClientResponseDto> => {
    const { data } = await apiClient.post<ClientResponseDto>(`${BASE_URL}/${id}/restore`);
    return data;
  },

  // Custom fields
  setCustomFieldValues: async (
    id: string,
    fieldData: SetCustomFieldValuesDto
  ): Promise<ClientResponseDto> => {
    const { data } = await apiClient.put<ClientResponseDto>(
      `${BASE_URL}/${id}/custom-fields`,
      fieldData
    );
    return data;
  },

  // Changelog
  getChangelog: async (clientId: string): Promise<ChangeLogResponseDto[]> => {
    interface BackendChangeLog {
      id: string;
      entityType: string;
      entityId: string;
      action: string;
      changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
      changedById: string;
      changedBy: { id: string; email: string; firstName: string; lastName: string };
      createdAt: string;
    }

    const { data } = await apiClient.get<{ logs: BackendChangeLog[]; total: number }>(
      `${BASE_URL}/${clientId}/changelog`
    );

    // Transform backend format to frontend format
    return data.logs.map((log) => {
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      log.changes.forEach((change) => {
        oldValues[change.field] = change.oldValue;
        newValues[change.field] = change.newValue;
      });

      return {
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        oldValues,
        newValues,
        userId: log.changedById,
        user: log.changedBy
          ? {
              id: log.changedBy.id,
              email: log.changedBy.email,
              firstName: log.changedBy.firstName,
              lastName: log.changedBy.lastName,
            }
          : undefined,
        createdAt: new Date(log.createdAt),
      } as ChangeLogResponseDto;
    });
  },

  // Statistics
  getStatistics: async (): Promise<ClientStatisticsDto> => {
    const { data } = await apiClient.get<ClientStatisticsDto>(`${BASE_URL}/statistics`);
    return data;
  },

  // Duplicate Detection
  checkDuplicates: async (dto: CheckDuplicatesDto): Promise<DuplicateCheckResultDto> => {
    const { data } = await apiClient.post<DuplicateCheckResultDto>(
      `${BASE_URL}/check-duplicates`,
      dto
    );
    return data;
  },

  // Bulk Operations
  bulkDelete: async (dto: BulkDeleteClientsDto): Promise<BulkOperationResultDto> => {
    const { data } = await apiClient.patch<BulkOperationResultDto>(
      `${BASE_URL}/bulk/delete`,
      dto
    );
    return data;
  },

  bulkRestore: async (dto: BulkRestoreClientsDto): Promise<BulkOperationResultDto> => {
    const { data } = await apiClient.patch<BulkOperationResultDto>(
      `${BASE_URL}/bulk/restore`,
      dto
    );
    return data;
  },

  bulkEdit: async (dto: BulkEditClientsDto): Promise<BulkOperationResultDto> => {
    const { data } = await apiClient.patch<BulkOperationResultDto>(
      `${BASE_URL}/bulk/edit`,
      dto
    );
    return data;
  },

  // Export/Import
  exportCsv: async (filters?: ClientFiltersDto): Promise<Blob> => {
    const params = buildCustomFieldParams(filters);
    const { data } = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: 'blob',
    });
    return data;
  },

  getImportTemplate: async (): Promise<Blob> => {
    const { data } = await apiClient.get(`${BASE_URL}/import/template`, {
      responseType: 'blob',
    });
    return data;
  },

  importCsv: async (file: File): Promise<ImportResultDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ImportResultDto>(`${BASE_URL}/import`, formData);
    return data;
  },
};

// Field Definitions API
const FIELD_DEFINITIONS_URL = '/api/modules/clients/field-definitions';

export interface FieldDefinitionQueryDto {
  page?: number;
  limit?: number;
}

export const fieldDefinitionsApi = {
  getAll: async (query?: FieldDefinitionQueryDto): Promise<PaginatedResponse<ClientFieldDefinitionResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<ClientFieldDefinitionResponseDto>>(FIELD_DEFINITIONS_URL, {
      params: query,
    });
    return data;
  },

  getById: async (id: string): Promise<ClientFieldDefinitionResponseDto> => {
    const { data } = await apiClient.get<ClientFieldDefinitionResponseDto>(
      `${FIELD_DEFINITIONS_URL}/${id}`
    );
    return data;
  },

  create: async (
    fieldData: CreateClientFieldDefinitionDto
  ): Promise<ClientFieldDefinitionResponseDto> => {
    const { data } = await apiClient.post<ClientFieldDefinitionResponseDto>(
      FIELD_DEFINITIONS_URL,
      fieldData
    );
    return data;
  },

  update: async (
    id: string,
    fieldData: UpdateClientFieldDefinitionDto
  ): Promise<ClientFieldDefinitionResponseDto> => {
    const { data } = await apiClient.patch<ClientFieldDefinitionResponseDto>(
      `${FIELD_DEFINITIONS_URL}/${id}`,
      fieldData
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${FIELD_DEFINITIONS_URL}/${id}`);
  },

  reorder: async (orderedIds: string[]): Promise<ClientFieldDefinitionResponseDto[]> => {
    const { data } = await apiClient.put<ClientFieldDefinitionResponseDto[]>(
      `${FIELD_DEFINITIONS_URL}/reorder`,
      { orderedIds }
    );
    return data;
  },
};

// Icons API
const ICONS_URL = '/api/modules/clients/icons';

export interface IconQueryDto {
  page?: number;
  limit?: number;
}

export const clientIconsApi = {
  getAll: async (query?: IconQueryDto): Promise<PaginatedResponse<ClientIconResponseDto>> => {
    const { data } = await apiClient.get<PaginatedResponse<ClientIconResponseDto>>(ICONS_URL, {
      params: query,
    });
    return data;
  },

  getById: async (id: string): Promise<ClientIconResponseDto> => {
    const { data } = await apiClient.get<ClientIconResponseDto>(`${ICONS_URL}/${id}`);
    return data;
  },

  create: async (iconData: CreateClientIconDto, file?: File): Promise<ClientIconResponseDto> => {
    const formData = new FormData();
    formData.append('name', iconData.name);

    if (file) {
      formData.append('file', file);
    }
    if (iconData.color) {
      formData.append('color', iconData.color);
    }
    if (iconData.iconType) {
      formData.append('iconType', iconData.iconType);
    }
    if (iconData.iconValue) {
      formData.append('iconValue', iconData.iconValue);
    }
    if (iconData.tooltip) {
      formData.append('tooltip', iconData.tooltip);
    }
    if (iconData.autoAssignCondition) {
      formData.append('autoAssignCondition', JSON.stringify(iconData.autoAssignCondition));
    }

    // Let axios/browser set the Content-Type automatically for FormData
    // Setting it explicitly breaks the multipart boundary
    const { data } = await apiClient.post<ClientIconResponseDto>(ICONS_URL, formData);
    return data;
  },

  update: async (id: string, iconData: UpdateClientIconDto): Promise<ClientIconResponseDto> => {
    // Handle autoAssignCondition - need to send null explicitly to clear it
    const payload = {
      ...iconData,
      autoAssignCondition: iconData.autoAssignCondition === null
        ? null
        : iconData.autoAssignCondition,
    };
    const { data } = await apiClient.patch<ClientIconResponseDto>(`${ICONS_URL}/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${ICONS_URL}/${id}`);
  },

  getClientIcons: async (clientId: string): Promise<ClientIconResponseDto[]> => {
    const { data } = await apiClient.get<ClientIconResponseDto[]>(`${ICONS_URL}/client/${clientId}`);
    return data;
  },

  assignIcon: async (clientId: string, iconId: string): Promise<{ id: string; clientId: string; iconId: string; isAutoAssigned: boolean; createdAt: Date }> => {
    const { data } = await apiClient.post(`${ICONS_URL}/assign`, { clientId, iconId });
    return data;
  },

  unassignIcon: async (clientId: string, iconId: string): Promise<void> => {
    await apiClient.delete(`${ICONS_URL}/unassign/${clientId}/${iconId}`);
  },

  getIconUrl: async (id: string): Promise<{ url: string }> => {
    const { data } = await apiClient.get<{ url: string }>(`${ICONS_URL}/${id}/url`);
    return data;
  },
};

// Notification Settings API
const NOTIFICATION_SETTINGS_URL = '/api/modules/clients/notification-settings';

export const notificationSettingsApi = {
  getMe: async (): Promise<NotificationSettingsResponseDto | null> => {
    try {
      const { data } = await apiClient.get<NotificationSettingsResponseDto>(
        `${NOTIFICATION_SETTINGS_URL}/me`
      );
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (
    settingsData: CreateNotificationSettingsDto
  ): Promise<NotificationSettingsResponseDto> => {
    const { data } = await apiClient.post<NotificationSettingsResponseDto>(
      NOTIFICATION_SETTINGS_URL,
      settingsData
    );
    return data;
  },

  update: async (
    settingsData: UpdateNotificationSettingsDto
  ): Promise<NotificationSettingsResponseDto> => {
    const { data } = await apiClient.patch<NotificationSettingsResponseDto>(
      `${NOTIFICATION_SETTINGS_URL}/me`,
      settingsData
    );
    return data;
  },

  delete: async (): Promise<void> => {
    await apiClient.delete(`${NOTIFICATION_SETTINGS_URL}/me`);
  },
};
