import type {
  NotificationFiltersDto,
  NotificationResponseDto,
  NotificationSettingsResponseDto,
  PaginatedNotificationsDto,
  UpdateNotificationSettingsDto,
} from '@/types/notifications';

import apiClient from '../client';

const BASE_URL = '/api/notifications';

export const notificationsApi = {
  getAll: async (filters?: NotificationFiltersDto): Promise<PaginatedNotificationsDto> => {
    const { data } = await apiClient.get<PaginatedNotificationsDto>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  getArchived: async (filters?: NotificationFiltersDto): Promise<PaginatedNotificationsDto> => {
    const { data } = await apiClient.get<PaginatedNotificationsDto>(`${BASE_URL}/archived`, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<NotificationResponseDto> => {
    const { data } = await apiClient.get<NotificationResponseDto>(`${BASE_URL}/${id}`);
    return data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get<{ count: number }>(`${BASE_URL}/unread-count`);
    return data;
  },

  markAsRead: async (id: string): Promise<NotificationResponseDto> => {
    const { data } = await apiClient.patch<NotificationResponseDto>(`${BASE_URL}/${id}/read`);
    return data;
  },

  markAsUnread: async (id: string): Promise<NotificationResponseDto> => {
    const { data } = await apiClient.patch<NotificationResponseDto>(`${BASE_URL}/${id}/unread`);
    return data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.post<{ count: number }>(`${BASE_URL}/mark-all-read`);
    return data;
  },

  archive: async (id: string): Promise<NotificationResponseDto> => {
    const { data } = await apiClient.patch<NotificationResponseDto>(`${BASE_URL}/${id}/archive`);
    return data;
  },

  restore: async (id: string): Promise<NotificationResponseDto> => {
    const { data } = await apiClient.patch<NotificationResponseDto>(`${BASE_URL}/${id}/restore`);
    return data;
  },

  archiveMultiple: async (ids: string[]): Promise<{ count: number }> => {
    const { data } = await apiClient.patch<{ count: number }>(`${BASE_URL}/archive-multiple`, {
      ids,
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};

export const notificationSettingsApi = {
  // Get all settings for the current user (returns array of module settings)
  getAll: async (): Promise<NotificationSettingsResponseDto[]> => {
    const { data } = await apiClient.get<NotificationSettingsResponseDto[]>(`${BASE_URL}/settings`);
    return data;
  },

  // Get settings for a specific module
  getByModule: async (moduleSlug: string): Promise<NotificationSettingsResponseDto> => {
    const { data } = await apiClient.get<NotificationSettingsResponseDto>(
      `${BASE_URL}/settings/modules/${moduleSlug}`
    );
    return data;
  },

  // Update settings for a specific module
  updateModule: async (
    moduleSlug: string,
    settings: UpdateNotificationSettingsDto
  ): Promise<NotificationSettingsResponseDto> => {
    const { data } = await apiClient.patch<NotificationSettingsResponseDto>(
      `${BASE_URL}/settings/modules/${moduleSlug}`,
      settings
    );
    return data;
  },

  // Update global settings (applies to all modules)
  updateGlobal: async (settings: UpdateNotificationSettingsDto): Promise<{ updated: number }> => {
    const { data } = await apiClient.patch<{ updated: number }>(
      `${BASE_URL}/settings/global`,
      settings
    );
    return data;
  },
};
