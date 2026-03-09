import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useArchivedNotifications,
  useArchiveMultipleNotifications,
  useArchiveNotification,
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useNotification,
  useNotifications,
  useNotificationSettings,
  useNotificationSettingsByModule,
  useRestoreNotification,
  useUnreadNotificationCount,
  useUpdateGlobalNotificationSettings,
  useUpdateModuleNotificationSettings,
} from './use-notifications';
import { notificationsApi, notificationSettingsApi } from '../api/endpoints/notifications';

// Mock the API modules
vi.mock('../api/endpoints/notifications');
vi.mock('@/components/ui/use-toast');

const mockToast = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockNotification = {
  id: 'notif-123',
  type: 'TASK_ASSIGNED',
  title: 'Nowe zadanie',
  message: 'Zostałeś przypisany do zadania',
  isRead: false,
  userId: 'user-123',
  companyId: 'company-123',
  createdAt: '2026-03-01T00:00:00Z',
};

const mockReadNotification = {
  ...mockNotification,
  id: 'notif-456',
  isRead: true,
};

const mockPaginatedNotifications = {
  data: [mockNotification, mockReadNotification],
  meta: {
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockSettings = [
  {
    id: 'setting-1',
    moduleSlug: 'tasks',
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
];

describe('use-notifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Notification Query Hooks
  // ========================================

  describe('useNotifications', () => {
    it('should fetch notifications', async () => {
      vi.mocked(notificationsApi.getAll).mockResolvedValue(mockPaginatedNotifications as any);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedNotifications);
      expect(notificationsApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to API', async () => {
      vi.mocked(notificationsApi.getAll).mockResolvedValue(mockPaginatedNotifications as any);
      const filters = { isRead: false, page: 2 };

      const { result } = renderHook(() => useNotifications(filters as any), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useArchivedNotifications', () => {
    it('should fetch archived notifications', async () => {
      vi.mocked(notificationsApi.getArchived).mockResolvedValue(mockPaginatedNotifications as any);

      const { result } = renderHook(() => useArchivedNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedNotifications);
      expect(notificationsApi.getArchived).toHaveBeenCalledWith(undefined);
    });
  });

  describe('useNotification', () => {
    it('should fetch single notification', async () => {
      vi.mocked(notificationsApi.getById).mockResolvedValue(mockNotification as any);

      const { result } = renderHook(() => useNotification('notif-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotification);
      expect(notificationsApi.getById).toHaveBeenCalledWith('notif-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useNotification(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(notificationsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useUnreadNotificationCount', () => {
    it('should fetch unread count', async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ count: 5 });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ count: 5 });
      expect(notificationsApi.getUnreadCount).toHaveBeenCalled();
    });

    it('should return zero count', async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ count: 0 });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ count: 0 });
    });
  });

  // ========================================
  // Read/Unread Toggle Hooks
  // ========================================

  describe('useMarkNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(notificationsApi.markAsRead).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      } as any);

      const { result } = renderHook(() => useMarkNotificationAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('notif-123');
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.markAsRead).mockRejectedValue({
        response: { data: { message: 'Mark read failed' } },
      });

      const { result } = renderHook(() => useMarkNotificationAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useMarkNotificationAsUnread', () => {
    it('should mark notification as unread', async () => {
      vi.mocked(notificationsApi.markAsUnread).mockResolvedValue({
        ...mockReadNotification,
        isRead: false,
      } as any);

      const { result } = renderHook(() => useMarkNotificationAsUnread(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-456');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.markAsUnread).toHaveBeenCalledWith('notif-456');
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.markAsUnread).mockRejectedValue({
        response: { data: { message: 'Mark unread failed' } },
      });

      const { result } = renderHook(() => useMarkNotificationAsUnread(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-456');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useMarkAllNotificationsAsRead', () => {
    it('should mark all as read and show success toast', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({ count: 5 });

      const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockRejectedValue({
        response: { data: { message: 'Mark all failed' } },
      });

      const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  // ========================================
  // Archive Hooks
  // ========================================

  describe('useArchiveNotification', () => {
    it('should archive notification and show success toast', async () => {
      vi.mocked(notificationsApi.archive).mockResolvedValue(mockNotification as any);

      const { result } = renderHook(() => useArchiveNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.archive).toHaveBeenCalledWith('notif-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.archive).mockRejectedValue({
        response: { data: { message: 'Archive failed' } },
      });

      const { result } = renderHook(() => useArchiveNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useRestoreNotification', () => {
    it('should restore notification and show success toast', async () => {
      vi.mocked(notificationsApi.restore).mockResolvedValue(mockNotification as any);

      const { result } = renderHook(() => useRestoreNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.restore).toHaveBeenCalledWith('notif-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.restore).mockRejectedValue({
        response: { data: { message: 'Restore failed' } },
      });

      const { result } = renderHook(() => useRestoreNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useArchiveMultipleNotifications', () => {
    it('should archive multiple and show success toast', async () => {
      vi.mocked(notificationsApi.archiveMultiple).mockResolvedValue({ count: 3 });

      const { result } = renderHook(() => useArchiveMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(['notif-1', 'notif-2', 'notif-3']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.archiveMultiple).toHaveBeenCalledWith([
        'notif-1',
        'notif-2',
        'notif-3',
      ]);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.archiveMultiple).mockRejectedValue({
        response: { data: { message: 'Archive multiple failed' } },
      });

      const { result } = renderHook(() => useArchiveMultipleNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(['notif-1']);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  // ========================================
  // Delete Hook
  // ========================================

  describe('useDeleteNotification', () => {
    it('should delete notification and show success toast', async () => {
      vi.mocked(notificationsApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.delete).toHaveBeenCalledWith('notif-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationsApi.delete).mockRejectedValue({
        response: { data: { message: 'Delete failed' } },
      });

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  // ========================================
  // Settings Hooks
  // ========================================

  describe('useNotificationSettings', () => {
    it('should fetch notification settings', async () => {
      vi.mocked(notificationSettingsApi.getAll).mockResolvedValue(mockSettings as any);

      const { result } = renderHook(() => useNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(notificationSettingsApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useNotificationSettingsByModule', () => {
    it('should fetch settings for a specific module', async () => {
      const moduleSetting = mockSettings[0];
      vi.mocked(notificationSettingsApi.getByModule).mockResolvedValue(moduleSetting as any);

      const { result } = renderHook(() => useNotificationSettingsByModule('tasks'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(moduleSetting);
      expect(notificationSettingsApi.getByModule).toHaveBeenCalledWith('tasks');
    });

    it('should not fetch when moduleSlug is empty', async () => {
      const { result } = renderHook(() => useNotificationSettingsByModule(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(notificationSettingsApi.getByModule).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateModuleNotificationSettings', () => {
    it('should update module settings and show success toast', async () => {
      vi.mocked(notificationSettingsApi.updateModule).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useUpdateModuleNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          moduleSlug: 'tasks',
          settings: { emailEnabled: false } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationSettingsApi.updateModule).toHaveBeenCalledWith('tasks', {
        emailEnabled: false,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationSettingsApi.updateModule).mockRejectedValue({
        response: { data: { message: 'Update settings failed' } },
      });

      const { result } = renderHook(() => useUpdateModuleNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          moduleSlug: 'tasks',
          settings: { emailEnabled: false } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useUpdateGlobalNotificationSettings', () => {
    it('should update global settings and show success toast', async () => {
      vi.mocked(notificationSettingsApi.updateGlobal).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useUpdateGlobalNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ emailEnabled: true } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(notificationSettingsApi.updateGlobal).toHaveBeenCalledWith({ emailEnabled: true });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(notificationSettingsApi.updateGlobal).mockRejectedValue({
        response: { data: { message: 'Global update failed' } },
      });

      const { result } = renderHook(() => useUpdateGlobalNotificationSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ emailEnabled: true } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should handle network errors on queries', async () => {
      vi.mocked(notificationsApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should show generic error message when API error has no message on mark all read', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockRejectedValue({});

      const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się oznaczyć wszystkich jako przeczytane',
        })
      );
    });
  });
});
