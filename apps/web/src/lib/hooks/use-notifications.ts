import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import type { ApiErrorResponse } from '@/types/api';
import type { NotificationFiltersDto, UpdateNotificationSettingsDto } from '@/types/notifications';

import { notificationsApi, notificationSettingsApi } from '../api/endpoints/notifications';
import { queryKeys } from '../api/query-client';

/**
 * Converts NotificationFiltersDto to a query-key safe Record.
 * This provides type safety while ensuring the filter values are
 * properly serializable for query key comparison.
 */
function toQueryKeyFilters(filters?: NotificationFiltersDto): Record<string, unknown> | undefined {
  if (!filters) return undefined;

  // Only include defined values to keep query keys consistent
  const result: Record<string, unknown> = {};
  if (filters.page !== undefined) result.page = filters.page;
  if (filters.limit !== undefined) result.limit = filters.limit;
  if (filters.type !== undefined) result.type = filters.type;
  if (filters.moduleSlug !== undefined) result.moduleSlug = filters.moduleSlug;
  if (filters.isRead !== undefined) result.isRead = filters.isRead;
  if (filters.isArchived !== undefined) result.isArchived = filters.isArchived;

  return Object.keys(result).length > 0 ? result : undefined;
}

export function useNotifications(filters?: NotificationFiltersDto) {
  return useQuery({
    queryKey: queryKeys.notifications.list(toQueryKeyFilters(filters)),
    queryFn: () => notificationsApi.getAll(filters),
  });
}

export function useArchivedNotifications(filters?: NotificationFiltersDto) {
  return useQuery({
    queryKey: queryKeys.notifications.archived(toQueryKeyFilters(filters)),
    queryFn: () => notificationsApi.getArchived(filters),
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się oznaczyć jako przeczytane',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkNotificationAsUnread() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsUnread(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się oznaczyć jako nieprzeczytane',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });
      toast({
        title: 'Sukces',
        description: `Oznaczono ${data.count} powiadomień jako przeczytane`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się oznaczyć wszystkich jako przeczytane',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.archive(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      toast({
        title: 'Sukces',
        description: 'Powiadomienie zostało zarchiwizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zarchiwizować powiadomienia',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.restore(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      toast({
        title: 'Sukces',
        description: 'Powiadomienie zostało przywrócone',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przywrócić powiadomienia',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveMultipleNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.archiveMultiple(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });
      toast({
        title: 'Sukces',
        description: `Zarchiwizowano ${data.count} powiadomień`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zarchiwizować powiadomień',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Powiadomienie zostało usunięte',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć powiadomienia',
        variant: 'destructive',
      });
    },
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notifications.settings,
    queryFn: () => notificationSettingsApi.getAll(),
  });
}

export function useNotificationSettingsByModule(moduleSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.notifications.settings, moduleSlug],
    queryFn: () => notificationSettingsApi.getByModule(moduleSlug),
    enabled: !!moduleSlug,
  });
}

export function useUpdateModuleNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      moduleSlug,
      settings,
    }: {
      moduleSlug: string;
      settings: UpdateNotificationSettingsDto;
    }) => notificationSettingsApi.updateModule(moduleSlug, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings });
      toast({
        title: 'Sukces',
        description: 'Ustawienia powiadomień zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się zaktualizować ustawień powiadomień',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateGlobalNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settings: UpdateNotificationSettingsDto) =>
      notificationSettingsApi.updateGlobal(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings });
      toast({
        title: 'Sukces',
        description: 'Globalne ustawienia powiadomień zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się zaktualizować ustawień powiadomień',
        variant: 'destructive',
      });
    },
  });
}
