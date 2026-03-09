import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGlobalDashboard } from './use-global-dashboard';
import { clientsApi } from '../api/endpoints/clients';
import { notificationsApi } from '../api/endpoints/notifications';
import { leadsApi, offersApi } from '../api/endpoints/offers';
import { settlementsApi } from '../api/endpoints/settlements';
import { tasksApi } from '../api/endpoints/tasks';
import { timeReportsApi } from '../api/endpoints/time-tracking';

// Mock the API modules
vi.mock('../api/endpoints/clients');
vi.mock('../api/endpoints/notifications');
vi.mock('../api/endpoints/offers');
vi.mock('../api/endpoints/settlements');
vi.mock('../api/endpoints/tasks');
vi.mock('../api/endpoints/time-tracking');

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

const mockClientStats = { totalClients: 15, activeClients: 12 };
const mockSettlementStats = { totalSettlements: 30, pending: 5 };
const mockTaskStats = { total: 50, completed: 30, inProgress: 15 };
const mockTimeStats = { totalHours: 120, totalAmount: 12000 };
const mockOfferStats = { total: 20, accepted: 8 };
const mockLeadStats = { total: 25, converted: 5 };
const mockUnreadCount = { count: 3 };

describe('use-global-dashboard hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGlobalDashboard', () => {
    it('should fetch all module data when all modules are enabled', async () => {
      vi.mocked(clientsApi.getStatistics).mockResolvedValue(mockClientStats as any);
      vi.mocked(settlementsApi.getOverviewStats).mockResolvedValue(mockSettlementStats as any);
      vi.mocked(tasksApi.getGlobalStatistics).mockResolvedValue(mockTaskStats as any);
      vi.mocked(timeReportsApi.getSummary).mockResolvedValue(mockTimeStats as any);
      vi.mocked(offersApi.getStatistics).mockResolvedValue(mockOfferStats as any);
      vi.mocked(leadsApi.getStatistics).mockResolvedValue(mockLeadStats as any);
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules = ['clients', 'settlements', 'tasks', 'time-tracking', 'offers'];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAnyLoading).toBe(false);
      });

      expect(result.current.clientStats).toEqual(mockClientStats);
      expect(result.current.settlementStats).toEqual(mockSettlementStats);
      expect(result.current.taskStats).toEqual(mockTaskStats);
      expect(result.current.timeStats).toEqual(mockTimeStats);
      expect(result.current.offerStats).toEqual(mockOfferStats);
      expect(result.current.leadStats).toEqual(mockLeadStats);
      expect(result.current.unreadCount).toBe(3);
    });

    it('should not fetch disabled modules', async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules: string[] = [];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notificationsLoading).toBe(false);
      });

      // Disabled modules should not be fetched
      expect(clientsApi.getStatistics).not.toHaveBeenCalled();
      expect(settlementsApi.getOverviewStats).not.toHaveBeenCalled();
      expect(tasksApi.getGlobalStatistics).not.toHaveBeenCalled();
      expect(timeReportsApi.getSummary).not.toHaveBeenCalled();
      expect(offersApi.getStatistics).not.toHaveBeenCalled();
      expect(leadsApi.getStatistics).not.toHaveBeenCalled();

      // Notifications are always fetched
      expect(notificationsApi.getUnreadCount).toHaveBeenCalled();
    });

    it('should return hasModule helper', async () => {
      vi.mocked(clientsApi.getStatistics).mockResolvedValue(mockClientStats as any);
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules = ['clients', 'tasks'];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasModule('clients')).toBe(true);
      expect(result.current.hasModule('tasks')).toBe(true);
      expect(result.current.hasModule('settlements')).toBe(false);
      expect(result.current.hasModule('time-tracking')).toBe(false);
    });

    it('should return default unread count of 0 when loading', async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const { result } = renderHook(() => useGlobalDashboard([]), {
        wrapper: createWrapper(),
      });

      // Before loading completes, unreadCount should default to 0
      expect(result.current.unreadCount).toBe(0);
    });

    it('should only fetch offers and leads when offers module is enabled', async () => {
      vi.mocked(offersApi.getStatistics).mockResolvedValue(mockOfferStats as any);
      vi.mocked(leadsApi.getStatistics).mockResolvedValue(mockLeadStats as any);
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules = ['offers'];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.notificationsLoading).toBe(false);
      });

      expect(offersApi.getStatistics).toHaveBeenCalled();
      expect(leadsApi.getStatistics).toHaveBeenCalled();
      expect(clientsApi.getStatistics).not.toHaveBeenCalled();
      expect(tasksApi.getGlobalStatistics).not.toHaveBeenCalled();
    });

    it('should report loading state per module', async () => {
      // Make clients slow, others fast
      vi.mocked(clientsApi.getStatistics).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockClientStats as any), 100))
      );
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules = ['clients'];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.clientsLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.clientsLoading).toBe(false);
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(clientsApi.getStatistics).mockRejectedValue(new Error('API Error'));
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules = ['clients'];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.clientsLoading).toBe(false);
      });

      // clientStats should be undefined on error
      expect(result.current.clientStats).toBeUndefined();
      // Notifications should still work
      expect(result.current.unreadCount).toBe(3);
    });

    it('should not report loading for disabled modules', async () => {
      vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue(mockUnreadCount as any);

      const enabledModules: string[] = [];

      const { result } = renderHook(() => useGlobalDashboard(enabledModules), {
        wrapper: createWrapper(),
      });

      // Disabled modules should not show as loading
      expect(result.current.clientsLoading).toBe(false);
      expect(result.current.settlementsLoading).toBe(false);
      expect(result.current.tasksLoading).toBe(false);
      expect(result.current.timeLoading).toBe(false);
      expect(result.current.offersLoading).toBe(false);
      expect(result.current.leadsLoading).toBe(false);
    });
  });
});
