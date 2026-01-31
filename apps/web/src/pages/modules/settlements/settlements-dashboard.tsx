import { AlertTriangle, Calculator, CheckCircle, Clock, List, Settings, Users } from 'lucide-react';

import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { useMyStats, useSettlementStats } from '@/lib/hooks/use-settlements';
import { UserRole } from '@/types/enums';

export default function SettlementsDashboardPage() {
  const { user } = useAuthContext();
  const basePath = useModuleBasePath('settlements');

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Check if user is owner or admin
  const isOwnerOrAdmin = user?.role === UserRole.COMPANY_OWNER || user?.role === UserRole.ADMIN;

  // Fetch statistics based on role
  const { data: overviewStats, isPending: overviewPending } = useSettlementStats(
    currentMonth,
    currentYear
  );
  const { data: myStats, isPending: myStatsPending } = useMyStats(currentMonth, currentYear);

  // Use appropriate stats based on role
  const stats = isOwnerOrAdmin ? overviewStats : myStats;
  const isPending = isOwnerOrAdmin ? overviewPending : myStatsPending;

  // Calculate completion rate percentage
  const completionRate = stats?.completionRate
    ? `${Math.round(stats.completionRate * 100)}%`
    : '0%';

  // Features available based on role
  const features = [
    {
      title: 'Lista rozliczeń',
      description: 'Przeglądaj i zarządzaj rozliczeniami klientów',
      icon: List,
      href: `${basePath}/list`,
      gradient: 'bg-apptax-gradient',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE],
    },
    {
      title: 'Zarządzanie zespołem',
      description: 'Przypisywanie klientów, statystyki pracowników',
      icon: Users,
      href: `${basePath}/team`,
      gradient: 'bg-apptax-dark-gradient',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER],
    },
    {
      title: 'Ustawienia modułu',
      description: 'Konfiguracja rozliczeń i powiadomień',
      icon: Settings,
      href: `${basePath}/settings`,
      gradient: 'bg-slate-600',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER],
    },
  ];

  // Filter features based on user role
  const availableFeatures = features.filter(
    (feature) => user?.role && feature.roles.includes(user.role)
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Moduł Rozliczenia
          <div className="bg-apptax-teal h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarządzanie miesięcznymi rozliczeniami klientów -{' '}
          {currentMonth.toString().padStart(2, '0')}/{currentYear}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-6">
        <StatCard
          label="Wszystkie rozliczenia"
          value={stats?.total ?? 0}
          icon={Calculator}
          iconBg="bg-apptax-gradient"
          valueColor="text-apptax-navy"
          borderColor="border-apptax-soft-teal/30"
          isLoading={isPending}
        />

        <StatCard
          label="Oczekujące"
          value={stats?.pending ?? 0}
          icon={Clock}
          iconBg="bg-yellow-500"
          valueColor="text-yellow-600"
          borderColor="border-yellow-200"
          isLoading={isPending}
        />

        <StatCard
          label="W trakcie"
          value={stats?.inProgress ?? 0}
          icon={Clock}
          iconBg="bg-blue-500"
          valueColor="text-blue-600"
          borderColor="border-blue-200"
          isLoading={isPending}
        />

        <StatCard
          label="Zakończone"
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          iconBg="bg-green-500"
          valueColor="text-green-600"
          borderColor="border-green-200"
          isLoading={isPending}
        />

        <StatCard
          label="Realizacja"
          value={completionRate}
          icon={CheckCircle}
          iconBg="bg-apptax-teal"
          valueColor="text-apptax-teal"
          borderColor="border-apptax-soft-teal/30"
          isLoading={isPending}
        />

        {isOwnerOrAdmin && overviewStats && (
          <>
            <StatCard
              label="Nieprzypisane"
              value={overviewStats.unassigned ?? 0}
              icon={Users}
              iconBg="bg-orange-500"
              valueColor="text-orange-600"
              borderColor="border-orange-200"
              isLoading={overviewPending}
            />

            <StatCard
              label="Wymaga uwagi"
              value={overviewStats.requiresAttention ?? 0}
              icon={AlertTriangle}
              iconBg="bg-red-500"
              valueColor="text-red-600"
              borderColor="border-red-200"
              isLoading={overviewPending}
            />
          </>
        )}
      </div>

      {/* Feature Cards */}
      <div className="flex flex-wrap gap-6">
        {availableFeatures.map((feature) => (
          <NavigationCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            gradient={feature.gradient}
          />
        ))}
      </div>
    </div>
  );
}
