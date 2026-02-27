import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import type { ApiErrorResponse } from '@/types/api';
import type {
  NotificationFiltersDto,
  NotificationResponseDto,
  UpdateNotificationSettingsDto,
} from '@/types/notifications';


import { createMutationHook } from './create-mutation-hook';
import { CACHE_TIERS } from '../api/cache-config';
import { notificationsApi, notificationSettingsApi } from '../api/endpoints/notifications';
import { queryKeys } from '../api/query-client';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

// Use shared cache tiers (frequent=30s/5m, standard=1m/10m, stable=5m/10m)
const NOTIFICATION_LIST_CACHE = CACHE_TIERS.frequent;
const NOTIFICATION_DETAIL_CACHE = CACHE_TIERS.standard;
const NOTIFICATION_SETTINGS_CACHE = CACHE_TIERS.stable;

export function useNotifications(filters?: NotificationFiltersDto) {
  return useQuery({
    queryKey: queryKeys.notifications.list(buildQueryFilters(filters)),
    queryFn: () => notificationsApi.getAll(filters),
    ...NOTIFICATION_LIST_CACHE,
  });
}

export function useArchivedNotifications(filters?: NotificationFiltersDto) {
  return useQuery({
    queryKey: queryKeys.notifications.archived(buildQueryFilters(filters)),
    queryFn: () => notificationsApi.getArchived(filters),
    ...NOTIFICATION_LIST_CACHE,
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
    ...NOTIFICATION_DETAIL_CACHE,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    // No refetchInterval - rely on socket.io real-time updates via NotificationSocketContext
    // Socket events trigger queryClient.invalidateQueries for unreadCount on notification:new and notification:read
    ...NOTIFICATION_LIST_CACHE,
  });
}

/** Internal factory: creates an optimistic read/unread toggle mutation. */
function createReadToggle(targetRead: boolean) {
  return function useToggle() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
      mutationFn: (id: string) =>
        targetRead ? notificationsApi.markAsRead(id) : notificationsApi.markAsUnread(id),
      onMutate: async (id) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: queryKeys.notifications.all, exact: false }),
          queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount }),
        ]);

        const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.notifications.all });
        const previousUnreadCount = queryClient.getQueryData(queryKeys.notifications.unreadCount);

        queryClient.setQueriesData(
          { queryKey: queryKeys.notifications.all },
          (old: { data: NotificationResponseDto[] } | undefined) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: old.data.map((n) => (n.id === id ? { ...n, isRead: targetRead } : n)),
            };
          }
        );

        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          (old: { count: number } | undefined) => {
            if (!old) return old;
            return { count: targetRead ? Math.max(0, old.count - 1) : old.count + 1 };
          }
        );

        return { previousLists, previousUnreadCount };
      },
      onError: (error: ApiErrorResponse, _id, context) => {
        if (context?.previousLists) {
          context.previousLists.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
        if (context?.previousUnreadCount !== undefined) {
          queryClient.setQueryData(queryKeys.notifications.unreadCount, context.previousUnreadCount);
        }
        toast({
          title: 'Błąd',
          description: getApiErrorMessage(
            error,
            targetRead
              ? 'Nie udało się oznaczyć jako przeczytane'
              : 'Nie udało się oznaczyć jako nieprzeczytane'
          ),
          variant: 'destructive',
        });
      },
      onSettled: (_data, _error, id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.detail(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      },
    });
  };
}

export const useMarkNotificationAsRead = createReadToggle(true);
export const useMarkNotificationAsUnread = createReadToggle(false);

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      toast({
        title: 'Sukces',
        description: `Oznaczono ${data.count} powiadomień jako przeczytane`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się oznaczyć wszystkich jako przeczytane'),
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
    onMutate: async (id) => {
      // Cancel any outgoing refetches in parallel
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.all, exact: false }),
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount }),
      ]);

      // Snapshot current state for rollback
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.notifications.all });
      const previousUnreadCount = queryClient.getQueryData(queryKeys.notifications.unreadCount);

      // Find if the notification was unread (for count adjustment)
      let wasUnread = false;
      previousLists.forEach(([, data]) => {
        const listData = data as { data: NotificationResponseDto[] } | undefined;
        const notification = listData?.data?.find((n) => n.id === id);
        if (notification && !notification.isRead) {
          wasUnread = true;
        }
      });

      // Optimistically remove notification from lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.notifications.all },
        (old: { data: NotificationResponseDto[]; meta?: unknown } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((n) => n.id !== id),
          };
        }
      );

      // Optimistically decrement unread count if notification was unread
      if (wasUnread) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          (old: { count: number } | undefined) => {
            if (!old) return old;
            return { count: Math.max(0, old.count - 1) };
          }
        );
      }

      return { previousLists, previousUnreadCount };
    },
    onError: (error: ApiErrorResponse, _id, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount, context.previousUnreadCount);
      }
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zarchiwizować powiadomienia'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Powiadomienie zostało zarchiwizowane',
      });
    },
    onSettled: (_data, _error, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export const useRestoreNotification = createMutationHook<void, string>({
  mutationFn: (id) => notificationsApi.restore(id),
  invalidateKeys: [queryKeys.notifications.unreadCount],
  onSuccess: (_, id, qc) => {
    qc.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
  },
  successMessage: 'Powiadomienie zostało przywrócone',
  errorMessage: 'Nie udało się przywrócić powiadomienia',
});

export function useArchiveMultipleNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.archiveMultiple(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      toast({
        title: 'Sukces',
        description: `Zarchiwizowano ${data.count} powiadomień`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zarchiwizować powiadomień'),
        variant: 'destructive',
      });
    },
  });
}

export const useDeleteNotification = createMutationHook<void, string>({
  mutationFn: (id) => notificationsApi.delete(id),
  onSuccess: (_, id, qc) => {
    qc.removeQueries({ queryKey: queryKeys.notifications.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
  },
  successMessage: 'Powiadomienie zostało usunięte',
  errorMessage: 'Nie udało się usunąć powiadomienia',
});

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notifications.settings,
    queryFn: () => notificationSettingsApi.getAll(),
    ...NOTIFICATION_SETTINGS_CACHE,
  });
}

export function useNotificationSettingsByModule(moduleSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.notifications.settings, moduleSlug],
    queryFn: () => notificationSettingsApi.getByModule(moduleSlug),
    enabled: !!moduleSlug,
    ...NOTIFICATION_SETTINGS_CACHE,
  });
}

export const useUpdateModuleNotificationSettings = createMutationHook<
  void,
  { moduleSlug: string; settings: UpdateNotificationSettingsDto }
>({
  mutationFn: ({ moduleSlug, settings }) =>
    notificationSettingsApi.updateModule(moduleSlug, settings),
  invalidateKeys: [queryKeys.notifications.settings],
  successMessage: 'Ustawienia powiadomień zostały zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować ustawień powiadomień',
});

export const useUpdateGlobalNotificationSettings = createMutationHook<
  void,
  UpdateNotificationSettingsDto
>({
  mutationFn: (settings) => notificationSettingsApi.updateGlobal(settings),
  invalidateKeys: [queryKeys.notifications.settings],
  successMessage: 'Globalne ustawienia powiadomień zostały zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować ustawień powiadomień',
});
