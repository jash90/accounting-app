import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  List,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings,
  ArrowRight,
  Timer,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/auth-context';
import { useTimeEntries, useActiveTimer } from '@/lib/hooks/use-time-tracking';
import { UserRole, TimeEntryStatus } from '@/types/enums';
import { Skeleton } from '@/components/ui/skeleton';
import { TimerWidget } from '@/components/time-tracking';

export default function TimeTrackingDashboardPage() {
  const { user } = useAuthContext();
  const { data: entriesData, isPending: entriesLoading } = useTimeEntries({ limit: 100 });
  const { data: activeTimer } = useActiveTimer();

  const entries = entriesData?.data ?? [];

  // Calculate statistics
  const totalEntries = entries.length;
  const runningEntries = entries.filter((e) => e.isRunning).length;
  const billableMinutes = entries
    .filter((e) => e.isBillable && !e.isRunning)
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const totalAmount = entries
    .filter((e) => !e.isRunning)
    .reduce((sum, e) => {
      const amount = e.totalAmount != null ? parseFloat(String(e.totalAmount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/time-tracking';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/time-tracking';
      default:
        return '/modules/time-tracking';
    }
  };

  const basePath = getBasePath();

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // View options
  const views = [
    {
      title: 'Lista wpisów',
      description: 'Przeglądaj wszystkie wpisy czasu z filtrowaniem i edycją',
      icon: List,
      href: `${basePath}/entries`,
      gradient: 'bg-apptax-gradient',
    },
    {
      title: 'Timesheet dzienny',
      description: 'Widok dzienny z podsumowaniem czasu pracy',
      icon: Calendar,
      href: `${basePath}/timesheet/daily`,
      gradient: 'bg-apptax-dark-gradient',
    },
    {
      title: 'Timesheet tygodniowy',
      description: 'Widok tygodniowy z analizą czasu',
      icon: CalendarDays,
      href: `${basePath}/timesheet/weekly`,
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
  ];

  // Settings option (only for admins and company owners)
  const showSettings =
    user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Logowanie czasu
          <div className="w-3 h-3 rounded-full bg-apptax-teal" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Śledź czas pracy i generuj raporty rozliczeniowe
        </p>
      </div>

      {/* Timer Widget */}
      <TimerWidget />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-apptax-soft-teal/30">
          <CardHeader className="pb-2">
            <CardDescription>Wszystkie wpisy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-apptax-gradient text-white">
                <Clock className="h-5 w-5" />
              </div>
              {entriesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-apptax-navy">{totalEntries}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>Aktywne timery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <Timer className="h-5 w-5" />
              </div>
              {entriesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-green-600">
                  {activeTimer?.isRunning ? 1 : runningEntries}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription>Czas rozliczalny</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              {entriesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  {formatHours(billableMinutes)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardDescription>Wartość</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              {entriesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold text-purple-600">
                  {totalAmount.toLocaleString('pl-PL')} PLN
                </span>
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

      {/* Reports Card */}
      <Card className="hover:shadow-apptax-md transition-all duration-200 hover:border-apptax-blue">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <CardTitle className="text-apptax-navy">Raporty</CardTitle>
          </div>
          <CardDescription>
            Generuj raporty rozliczeniowe i eksportuj dane do CSV/Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={`${basePath}/reports`}>
            <Button className="w-full bg-apptax-blue hover:bg-apptax-blue/90">
              Otwórz raporty
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

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
              Konfiguruj zaokrąglanie czasu, domyślne stawki i workflow zatwierdzania
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
