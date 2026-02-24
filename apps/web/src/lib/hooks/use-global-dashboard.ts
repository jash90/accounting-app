import { useQueries } from '@tanstack/react-query';

import { clientsApi } from '../api/endpoints/clients';
import { notificationsApi } from '../api/endpoints/notifications';
import { leadsApi, offersApi } from '../api/endpoints/offers';
import { settlementsApi } from '../api/endpoints/settlements';
import { tasksApi } from '../api/endpoints/tasks';
import { timeReportsApi } from '../api/endpoints/time-tracking';
import { queryKeys } from '../api/query-client';

function getMonthDateRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { startDate, endDate, month: now.getMonth() + 1, year: now.getFullYear() };
}

export function useGlobalDashboard(enabledModules: string[]) {
  const hasModule = (slug: string) => enabledModules.includes(slug);
  const { startDate, endDate, month, year } = getMonthDateRange();

  const results = useQueries({
    queries: [
      // 0: clients statistics
      {
        queryKey: queryKeys.clients.statistics,
        queryFn: () => clientsApi.getStatistics(),
        staleTime: 30 * 1000,
        enabled: hasModule('clients'),
      },
      // 1: settlements overview stats
      {
        queryKey: queryKeys.settlements.stats.overview(month, year),
        queryFn: () => settlementsApi.getOverviewStats(month, year),
        staleTime: 30 * 1000,
        enabled: hasModule('settlements'),
      },
      // 2: global task statistics
      {
        queryKey: queryKeys.tasks.globalStatistics,
        queryFn: () => tasksApi.getGlobalStatistics(),
        staleTime: 30 * 1000,
        enabled: hasModule('tasks'),
      },
      // 3: time tracking summary (current month)
      {
        queryKey: queryKeys.timeTracking.reports.summary({ startDate, endDate }),
        queryFn: () => timeReportsApi.getSummary({ startDate, endDate }),
        staleTime: 30 * 1000,
        enabled: hasModule('time-tracking'),
      },
      // 4: offer statistics
      {
        queryKey: queryKeys.offers.statistics,
        queryFn: () => offersApi.getStatistics(),
        staleTime: 30 * 1000,
        enabled: hasModule('offers'),
      },
      // 5: lead statistics
      {
        queryKey: queryKeys.leads.statistics,
        queryFn: () => leadsApi.getStatistics(),
        staleTime: 30 * 1000,
        enabled: hasModule('offers'),
      },
      // 6: unread notifications count (always)
      {
        queryKey: queryKeys.notifications.unreadCount,
        queryFn: () => notificationsApi.getUnreadCount(),
        staleTime: 30 * 1000,
        enabled: true,
      },
    ],
  });

  const [
    clientsResult,
    settlementsResult,
    tasksResult,
    timeResult,
    offersResult,
    leadsResult,
    notificationsResult,
  ] = results;

  return {
    clientStats: clientsResult.data,
    clientsLoading: clientsResult.isPending && hasModule('clients'),
    settlementStats: settlementsResult.data,
    settlementsLoading: settlementsResult.isPending && hasModule('settlements'),
    taskStats: tasksResult.data,
    tasksLoading: tasksResult.isPending && hasModule('tasks'),
    timeStats: timeResult.data,
    timeLoading: timeResult.isPending && hasModule('time-tracking'),
    offerStats: offersResult.data,
    offersLoading: offersResult.isPending && hasModule('offers'),
    leadStats: leadsResult.data,
    leadsLoading: leadsResult.isPending && hasModule('offers'),
    unreadCount: notificationsResult.data?.count ?? 0,
    notificationsLoading: notificationsResult.isPending,
    isAnyLoading: results.some((r) => r.isPending),
    hasModule,
  };
}

export type GlobalDashboardData = ReturnType<typeof useGlobalDashboard>;
