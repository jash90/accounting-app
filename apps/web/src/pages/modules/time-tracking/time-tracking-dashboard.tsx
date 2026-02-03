import {
  BarChart3,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  List,
  Settings,
  Timer,
  TrendingUp,
} from 'lucide-react';

import { TimerWidget } from '@/components/time-tracking';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useActiveTimer, useTimeEntries } from '@/lib/hooks/use-time-tracking';
import { UserRole } from '@/types/enums';


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
  ];

  // Settings option (only for admins and company owners)
  const showSettings = user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

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

      {/* Timer Widget */}
      <TimerWidget />

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
          value={formatHours(billableMinutes)}
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
    </div>
  );
}
