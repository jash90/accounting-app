import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  GanttChartSquare,
  LayoutGrid,
  LayoutTemplate,
  List,
  Settings,
} from 'lucide-react';

import { TasksStatusChart } from '@/components/dashboard/charts/tasks-status-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useEmployeeTaskRanking,
  useGlobalTaskStatistics,
  useTaskCompletionStats,
} from '@/lib/hooks/use-tasks';
import { UserRole } from '@/types/enums';

function ExtendedTaskStats() {
  const { data: rankingData } = useEmployeeTaskRanking();
  const { data: durationData } = useTaskCompletionStats();

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ranking pracowników - ukończone zadania</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingData?.rankings?.length === 0 && (
            <p className="text-muted-foreground text-sm">Brak danych</p>
          )}
          <div className="space-y-2">
            {rankingData?.rankings
              ?.slice(0, 10)
              .map(
                (
                  r: {
                    userId: string;
                    firstName?: string;
                    lastName?: string;
                    email: string;
                    completedCount: number;
                  },
                  i: number
                ) => (
                  <div key={r.userId} className="flex items-center justify-between">
                    <span className="text-sm">
                      {i + 1}. {r.firstName} {r.lastName || r.email}
                    </span>
                    <span className="font-medium">{r.completedCount}</span>
                  </div>
                )
              )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Najdłuższe zadania (godz.)</CardTitle>
        </CardHeader>
        <CardContent>
          {durationData?.longest?.length === 0 && (
            <p className="text-muted-foreground text-sm">Brak danych</p>
          )}
          <div className="space-y-2">
            {durationData?.longest
              ?.slice(0, 5)
              .map((t: { id: string; title: string; durationHours: number }) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="max-w-[200px] truncate text-sm">{t.title}</span>
                  <span className="font-medium">{t.durationHours}h</span>
                </div>
              ))}
          </div>
          {durationData && (
            <p className="text-muted-foreground mt-2 text-xs">
              Średnia: {durationData.averageDurationHours}h
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TasksDashboardPage() {
  const { user } = useAuthContext();
  const { data, isPending } = useGlobalTaskStatistics();

  const totalTasks = data?.total ?? 0;
  const inProgressTasks = data?.byStatus?.['IN_PROGRESS'] ?? 0;
  const overdueTasks = data?.overdue ?? 0;
  const completedTasks = data?.byStatus?.['DONE'] ?? 0;

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  };

  const basePath = getBasePath();

  // View options
  const views = [
    {
      title: 'Lista zadań',
      description: 'Przeglądaj wszystkie zadania w formie tabeli z sortowaniem i filtrowaniem',
      icon: List,
      href: `${basePath}/list`,
      gradient: 'bg-primary',
    },
    {
      title: 'Tablica Kanban',
      description: 'Zarządzaj zadaniami metodą przeciągnij i upuść między kolumnami',
      icon: LayoutGrid,
      href: `${basePath}/kanban`,
      gradient: 'bg-primary',
    },
    {
      title: 'Kalendarz',
      description: 'Wyświetl zadania w widoku kalendarza według terminów',
      icon: Calendar,
      href: `${basePath}/calendar`,
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
    {
      title: 'Oś czasu',
      description: 'Zobacz zadania na osi czasu z datami rozpoczęcia i zakończenia',
      icon: GanttChartSquare,
      href: `${basePath}/timeline`,
      gradient: 'bg-gradient-to-br from-orange-500 to-red-500',
    },
  ];

  // Settings option (only for admins and company owners)
  const showSettings = user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Moduł Zadania
          <div className="bg-accent h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">Zarządzanie zadaniami z wieloma widokami</p>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-6">
        <StatCard
          label="Wszystkie zadania"
          value={totalTasks}
          icon={CheckSquare}
          iconBg="bg-primary"
          valueColor="text-foreground"
          borderColor="border-accent/30"
          isLoading={isPending}
        />

        <StatCard
          label="W trakcie"
          value={inProgressTasks}
          icon={Clock}
          iconBg="bg-blue-500"
          valueColor="text-blue-600"
          borderColor="border-blue-200"
          isLoading={isPending}
        />

        <StatCard
          label="Po terminie"
          value={overdueTasks}
          icon={AlertCircle}
          iconBg="bg-red-500"
          valueColor="text-red-600"
          borderColor="border-red-200"
          isLoading={isPending}
        />

        <StatCard
          label="Ukończone"
          value={completedTasks}
          icon={CheckCircle2}
          iconBg="bg-green-500"
          valueColor="text-green-600"
          borderColor="border-green-200"
          isLoading={isPending}
        />
      </div>

      {/* Status Chart */}
      {!isPending && data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status zadań</CardTitle>
          </CardHeader>
          <CardContent>
            <TasksStatusChart byStatus={data.byStatus} total={data.total} />
          </CardContent>
        </Card>
      )}

      {/* View Cards */}
      <div className="flex flex-wrap gap-6">
        {views.map((view) => (
          <NavigationCard
            key={view.title}
            title={view.title}
            description={view.description}
            icon={view.icon}
            href={view.href}
            gradient={view.gradient}
            className="flex-1 flex-shrink-0"
          />
        ))}
      </div>

      {/* Templates Card */}
      {showSettings && (
        <NavigationCard
          title="Szablony zadań"
          description="Twórz szablony wielokrotnego użytku i konfiguruj zadania cykliczne"
          icon={LayoutTemplate}
          href={`${basePath}/templates`}
          gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
          buttonText="Zarządzaj szablonami"
          buttonVariant="outline"
        />
      )}

      {/* Settings Card */}
      {showSettings && (
        <NavigationCard
          title="Ustawienia modułu"
          description="Zarządzaj etykietami zadań, domyślnymi ustawieniami i powiadomieniami"
          icon={Settings}
          href={`${basePath}/settings`}
          gradient="bg-gray-700"
          buttonText="Otwórz ustawienia"
          buttonVariant="outline"
        />
      )}

      {/* Extended statistics - admin/owner only */}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER) && (
        <ExtendedTaskStats />
      )}
    </div>
  );
}
