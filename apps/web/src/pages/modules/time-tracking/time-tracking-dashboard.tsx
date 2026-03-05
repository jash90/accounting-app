import { useMemo } from 'react';

import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  List,
  RefreshCw,
  Settings,
  Timer,
  TrendingUp,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { TimeTrackedChart } from '@/components/dashboard/charts/time-tracked-chart';
import { TimerWidget } from '@/components/time-tracking/timer-widget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useActiveTimer,
  useTimeEntries,
  useTimeSummaryReport,
} from '@/lib/hooks/use-time-tracking';
import { isOwnerOrAdmin } from '@/lib/utils/user';

function getMonthDateRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { startDate, endDate };
}

// Hoisted outside component - static JSX that doesn't depend on component state
// Prevents recreation on every render
const timerErrorFallback = (
  <Card className="w-full border-destructive/50 bg-destructive/5">
    <CardContent className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Błąd timera</p>
          <p className="text-muted-foreground text-sm">
            Nie udało się załadować timera. Odśwież stronę, aby spróbować ponownie.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Odśwież
      </Button>
    </CardContent>
  </Card>
);

export default function TimeTrackingDashboardPage() {
  const { user } = useAuthContext();
  const { data: entriesData, isPending: entriesLoading } = useTimeEntries({ limit: 100 });
  const { data: activeTimer } = useActiveTimer();
  const { startDate, endDate } = useMemo(() => getMonthDateRange(), []);
  const { data: monthSummary } = useTimeSummaryReport({ startDate, endDate });

  // Calculate statistics - memoized to prevent recalculation on every render
  const { totalEntries, runningEntries, billableMinutes, totalAmount } = useMemo(() => {
    const entries = entriesData?.data ?? [];
    const total = entries.length;
    const running = entries.filter((e) => e.isRunning).length;
    const billable = entries
      .filter((e) => e.isBillable && !e.isRunning)
      .reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const amount = entries
      .filter((e) => !e.isRunning)
      .reduce((sum, e) => {
        const amt = e.totalAmount != null ? parseFloat(String(e.totalAmount)) : 0;
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    return {
      totalEntries: total,
      runningEntries: running,
      billableMinutes: billable,
      totalAmount: amount,
    };
  }, [entriesData?.data]);

  const basePath = useModuleBasePath('time-tracking');

  const formatMinutesAsHoursMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // View options - memoized to prevent array recreation on every render
  const views = useMemo(
    () => [
      {
        title: 'Lista wpisów',
        description: 'Przeglądaj wszystkie wpisy czasu z filtrowaniem i edycją',
        icon: List,
        href: `${basePath}/entries`,
        gradient: 'bg-primary',
      },
      {
        title: 'Timesheet dzienny',
        description: 'Widok dzienny z podsumowaniem czasu pracy',
        icon: Calendar,
        href: `${basePath}/timesheet/daily`,
        gradient: 'bg-primary',
      },
      {
        title: 'Timesheet tygodniowy',
        description: 'Widok tygodniowy z analizą czasu',
        icon: CalendarDays,
        href: `${basePath}/timesheet/weekly`,
        gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
      },
      {
        title: 'Raporty',
        description: 'Generuj raporty rozliczeniowe i eksportuj dane do CSV/Excel',
        icon: BarChart3,
        href: `${basePath}/reports`,
        gradient: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      },
    ],
    [basePath]
  );

  // Settings option (only for admins and company owners)
  const showSettings = isOwnerOrAdmin(user);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Logowanie czasu
          <div className="bg-accent h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Śledź czas pracy i generuj raporty rozliczeniowe
        </p>
      </div>

      {/* Timer Widget - wrapped in ErrorBoundary to prevent full page crash */}
      <ErrorBoundary fallback={timerErrorFallback}>
        <TimerWidget />
      </ErrorBoundary>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-6">
        {/* Note: Statistics are based on latest 100 entries */}
        <StatCard
          label="Wszystkie wpisy"
          value={totalEntries}
          icon={Clock}
          iconBg="bg-primary"
          valueColor="text-foreground"
          borderColor="border-accent/30"
          isLoading={entriesLoading}
        />

        <StatCard
          label="Aktywne timery"
          value={activeTimer?.isRunning ? 1 : runningEntries}
          icon={Timer}
          iconBg="bg-green-500"
          valueColor="text-green-600"
          borderColor="border-green-200"
          isLoading={entriesLoading}
        />

        <StatCard
          label="Czas rozliczalny"
          value={formatMinutesAsHoursMinutes(billableMinutes)}
          icon={TrendingUp}
          iconBg="bg-blue-500"
          valueColor="text-blue-600"
          borderColor="border-blue-200"
          isLoading={entriesLoading}
          valueClassName="text-2xl"
        />

        <StatCard
          label="Wartość"
          value={`${totalAmount.toLocaleString('pl-PL')} PLN`}
          icon={DollarSign}
          iconBg="bg-purple-500"
          valueColor="text-purple-600"
          borderColor="border-purple-200"
          isLoading={entriesLoading}
          valueClassName="text-2xl"
        />
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Statystyki bazują na ostatnich 100 wpisach
      </p>

      {/* Monthly Summary Chart */}
      {monthSummary && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Czas w bieżącym miesiącu</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeTrackedChart
              totalMinutes={monthSummary.totalMinutes}
              billableMinutes={monthSummary.billableMinutes}
              nonBillableMinutes={monthSummary.nonBillableMinutes}
              totalAmount={monthSummary.totalAmount}
            />
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
            className="min-w-[280px] flex-1"
          />
        ))}
      </div>

      {/* Settings Card */}
      {showSettings && (
        <NavigationCard
          title="Ustawienia modułu"
          description="Konfiguruj zaokrąglanie czasu, domyślne stawki i workflow zatwierdzania"
          icon={Settings}
          href={`${basePath}/settings`}
          gradient="bg-gray-700"
          buttonText="Otwórz ustawienia"
          buttonVariant="outline"
        />
      )}

      {/* Statistics Card — only for admins and company owners */}
      {showSettings && (
        <NavigationCard
          title="Statystyki"
          description="Rozszerzone statystyki czasu pracy: najdłuższe zadania, rozliczenia i breakdown pracowników"
          icon={TrendingUp}
          href={`${basePath}/statistics`}
          gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
          buttonText="Zobacz statystyki"
          buttonVariant="outline"
        />
      )}
    </div>
  );
}
