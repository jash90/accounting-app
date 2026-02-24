import { Bell, CheckCircle, Clock, ListTodo, TrendingUp, Users } from 'lucide-react';

import { StatCard } from '@/components/ui/stat-card';
import { type GlobalDashboardData } from '@/lib/hooks/use-global-dashboard';

interface DashboardKPISectionProps {
  data: GlobalDashboardData;
  enabledModules: string[];
}

export function DashboardKPISection({ data, enabledModules }: DashboardKPISectionProps) {
  const hasModule = (slug: string) => enabledModules.includes(slug);

  const openTasks = data.taskStats
    ? (data.taskStats.byStatus['backlog'] ?? 0) +
      (data.taskStats.byStatus['todo'] ?? 0) +
      (data.taskStats.byStatus['in_progress'] ?? 0) +
      (data.taskStats.byStatus['in_review'] ?? 0)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {hasModule('clients') && (
        <StatCard
          label="Aktywni klienci"
          value={data.clientsLoading ? '...' : (data.clientStats?.active ?? 0)}
          icon={Users}
          iconBg="bg-blue-500"
          isLoading={data.clientsLoading}
        />
      )}

      {hasModule('tasks') && (
        <StatCard
          label="Otwarte zadania"
          value={data.tasksLoading ? '...' : openTasks}
          icon={ListTodo}
          iconBg="bg-orange-500"
          isLoading={data.tasksLoading}
        />
      )}

      {hasModule('settlements') && (
        <StatCard
          label="Ukończone rozlicz."
          value={
            data.settlementsLoading
              ? '...'
              : `${Math.round(data.settlementStats?.completionRate ?? 0)}%`
          }
          icon={CheckCircle}
          iconBg="bg-green-500"
          isLoading={data.settlementsLoading}
        />
      )}

      {hasModule('time-tracking') && (
        <StatCard
          label="Godziny w miesiącu"
          value={
            data.timeLoading ? '...' : `${Math.round((data.timeStats?.totalMinutes ?? 0) / 60)}h`
          }
          icon={Clock}
          iconBg="bg-purple-500"
          isLoading={data.timeLoading}
        />
      )}

      {hasModule('offers') && (
        <StatCard
          label="Konwersja ofert"
          value={
            data.offersLoading ? '...' : `${Math.round(data.offerStats?.conversionRate ?? 0)}%`
          }
          icon={TrendingUp}
          iconBg="bg-amber-500"
          isLoading={data.offersLoading}
        />
      )}

      <StatCard
        label="Powiadomienia"
        value={data.notificationsLoading ? '...' : data.unreadCount}
        icon={Bell}
        iconBg="bg-red-500"
        isLoading={data.notificationsLoading}
      />
    </div>
  );
}
