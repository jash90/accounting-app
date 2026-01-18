import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  List,
  LayoutGrid,
  Calendar,
  GanttChartSquare,
  Settings,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/auth-context';
import { useTasks } from '@/lib/hooks/use-tasks';
import { UserRole, TaskStatus } from '@/types/enums';
import { Skeleton } from '@/components/ui/skeleton';

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
  const showSettings =
    user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Moduł Zadania
          <div className="w-3 h-3 rounded-full bg-apptax-teal" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarządzanie zadaniami z wieloma widokami
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-apptax-soft-teal/30">
          <CardHeader className="pb-2">
            <CardDescription>Wszystkie zadania</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-apptax-gradient text-white">
                <CheckSquare className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-apptax-navy">{totalTasks}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription>W trakcie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Clock className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-blue-600">{inProgressTasks}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Po terminie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <AlertCircle className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-red-600">{overdueTasks}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>Ukończone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-green-600">{completedTasks}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <Card
              key={view.title}
              className="hover:shadow-apptax-md transition-all duration-200 hover:border-apptax-blue"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${view.gradient} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-apptax-navy">{view.title}</CardTitle>
                </div>
                <CardDescription>{view.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={view.href}>
                  <Button className="w-full bg-apptax-blue hover:bg-apptax-blue/90">
                    Otwórz
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Settings Card */}
      {showSettings && (
        <Card className="hover:shadow-apptax-md transition-all duration-200 hover:border-apptax-blue">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gray-700 text-white">
                <Settings className="h-6 w-6" />
              </div>
              <CardTitle className="text-apptax-navy">Ustawienia modułu</CardTitle>
            </div>
            <CardDescription>
              Zarządzaj etykietami zadań, domyślnymi ustawieniami i powiadomieniami
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`${basePath}/settings`}>
              <Button variant="outline" className="w-full">
                Otwórz ustawienia
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
