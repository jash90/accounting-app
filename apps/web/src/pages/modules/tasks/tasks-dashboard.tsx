import {
  CheckSquare,
  List,
  LayoutGrid,
  Calendar,
  GanttChartSquare,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useTasks } from '@/lib/hooks/use-tasks';
import { UserRole, TaskStatus } from '@/types/enums';

export default function TasksDashboardPage() {
  const { user } = useAuthContext();
  const { data, isPending } = useTasks();

  // Extract tasks array from paginated response
  const tasks = data?.data ?? [];

  // Calculate statistics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== TaskStatus.DONE &&
      t.status !== TaskStatus.CANCELLED
  ).length;
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;

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
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Tablica Kanban',
      description: 'Zarządzaj zadaniami metodą przeciągnij i upuść między kolumnami',
      icon: LayoutGrid,
      href: `${basePath}/kanban`,
      gradient: 'bg-apptax-dark-gradient',
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
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Moduł Zadania
          <div className="bg-apptax-teal h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">Zarządzanie zadaniami z wieloma widokami</p>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-6">
        <StatCard
          label="Wszystkie zadania"
          value={totalTasks}
          icon={CheckSquare}
          iconBg="bg-apptax-gradient"
          valueColor="text-apptax-navy"
          borderColor="border-apptax-soft-teal/30"
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
    </div>
  );
}
