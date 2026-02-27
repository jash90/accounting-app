import { useMemo, useState } from 'react';

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
import { RankedListCard } from '@/components/dashboard/ranked-list-card';
import { TimerWidget } from '@/components/time-tracking/timer-widget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useActiveTimer,
  useEmployeeTimeBreakdown,
  useTimeEntries,
  useTimeSummaryReport,
  useTopSettlementsByTime,
  useTopTasksByTime,
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

  const [extendedPreset, setExtendedPreset] = useState<'30d' | '90d' | '365d'>('30d');
  const { data: topTasks, isPending: topTasksLoading } = useTopTasksByTime(extendedPreset);
  const { data: topSettlements, isPending: topSettlementsLoading } =
    useTopSettlementsByTime(extendedPreset);
  const { data: employeeBreakdown, isPending: employeeBreakdownLoading } =
    useEmployeeTimeBreakdown(extendedPreset);

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

      {/* Extended Statistics Section — only for admins and company owners */}
      {showSettings && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-semibold">Rozszerzone statystyki</h2>
            <div className="flex gap-2">
              {(['30d', '90d', '365d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setExtendedPreset(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    extendedPreset === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p === '30d' ? '30 dni' : p === '90d' ? '90 dni' : 'Rok'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Top Tasks by Time */}
            <RankedListCard
              title="Top zadania (czas)"
              isPending={topTasksLoading}
              items={topTasks?.map(
                (item: {
                  taskId: string;
                  taskTitle: string;
                  totalMinutes: number;
                  totalHours: number;
                }) => ({
                  key: item.taskId,
                  label: item.taskTitle,
                  value: `${item.totalHours}h`,
                })
              )}
              limit={10}
              valueClassName="text-muted-foreground ml-2 shrink-0"
              className="border-border"
            />

            {/* Top Settlements by Time */}
            <RankedListCard
              title="Top rozliczenia (czas)"
              isPending={topSettlementsLoading}
              items={topSettlements?.map(
                (item: {
                  settlementId: string;
                  month: number;
                  year: number;
                  clientName?: string;
                  totalMinutes: number;
                  totalHours: number;
                }) => ({
                  key: item.settlementId,
                  label: item.clientName
                    ? `${item.clientName} (${item.month}/${item.year})`
                    : `${item.month}/${item.year}`,
                  value: `${item.totalHours}h`,
                })
              )}
              limit={10}
              valueClassName="text-muted-foreground ml-2 shrink-0"
              className="border-border"
            />

            {/* Employee Time Breakdown */}
            <Card className="border-border md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Czas pracownikow</CardTitle>
              </CardHeader>
              <CardContent>
                {employeeBreakdownLoading ? (
                  <p className="text-muted-foreground text-sm">Ładowanie...</p>
                ) : !employeeBreakdown || employeeBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Brak danych</p>
                ) : (
                  <div className="space-y-3">
                    {employeeBreakdown
                      .slice(0, 8)
                      .map(
                        (item: {
                          userId: string;
                          email: string;
                          firstName?: string;
                          lastName?: string;
                          taskMinutes: number;
                          settlementMinutes: number;
                          totalMinutes: number;
                        }) => {
                          const name =
                            item.firstName || item.lastName
                              ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
                              : item.email;
                          const taskHours = Math.round(item.taskMinutes / 6) / 10;
                          const settlementHours = Math.round(item.settlementMinutes / 6) / 10;
                          return (
                            <div key={item.userId} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span
                                  className="text-foreground max-w-[60%] truncate font-medium"
                                  title={item.email}
                                >
                                  {name}
                                </span>
                                <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                                  {Math.round(item.totalMinutes / 6) / 10}h łącznie
                                </span>
                              </div>
                              <div className="text-muted-foreground flex gap-3 text-xs">
                                <span>Zadania: {taskHours}h</span>
                                <span>Rozlicz.: {settlementHours}h</span>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
