import {
  AlertTriangle,
  Calculator,
  CheckCircle,
  Clock,
  FileQuestion,
  FileX,
  List,
  Settings,
  Users,
} from 'lucide-react';

import { SettlementsStatusChart } from '@/components/dashboard/charts/settlements-status-chart';
import { RankedListCard } from '@/components/dashboard/ranked-list-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useMySettlementStats,
  useSettlementBlockedClientsStats,
  useSettlementEmployeeRanking,
  useSettlementStats,
} from '@/lib/hooks/use-settlements';
import { isOwnerOrAdmin } from '@/lib/utils/user';
import { UserRole } from '@/types/enums';


function ExtendedSettlementStats() {
  const employeeRankingQuery = useSettlementEmployeeRanking();
  const blockedClientsQuery = useSettlementBlockedClientsStats();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <RankedListCard
        title="Ranking pracowników (ukończone rozliczenia)"
        isPending={employeeRankingQuery.isPending}
        items={employeeRankingQuery.data?.rankings?.map(
          (
            item: {
              userId: string;
              firstName?: string;
              lastName?: string;
              email: string;
              completedCount: number;
            },
            index: number
          ) => ({
            key: item.userId,
            label: `${index + 1}. ${
              item.firstName || item.lastName
                ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()
                : item.email
            }`,
            value: item.completedCount,
          })
        )}
        limit={10}
        valueClassName="font-semibold text-green-600"
      />
      <RankedListCard
        title="Klienci z blokadami rozliczeń"
        isPending={blockedClientsQuery.isPending}
        items={blockedClientsQuery.data?.clients?.map(
          (item: { clientId: string; clientName: string; blockCount: number }) => ({
            key: item.clientId,
            label: item.clientName,
            value: item.blockCount,
          })
        )}
        limit={10}
        emptyMessage="Brak klientów z blokadami"
        valueClassName="font-semibold text-red-600"
      />
    </div>
  );
}

export default function SettlementsDashboardPage() {
  const { user } = useAuthContext();
  const basePath = useModuleBasePath('settlements');

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Check if user is owner or admin
  const showForOwner = isOwnerOrAdmin(user);

  // Fetch stats conditionally based on role to avoid unnecessary API calls
  // Performance: Employees only fetch their own stats (1 request vs 3)
  // Owners/Admins fetch overview stats which includes all data they need
  const overviewQuery = useSettlementStats(currentMonth, currentYear);
  const myQuery = useMySettlementStats(currentMonth, currentYear);

  // Use appropriate stats based on role
  const stats = showForOwner ? overviewQuery.data : myQuery.data;
  const isPending = showForOwner ? overviewQuery.isPending : myQuery.isPending;
  const overviewStats = overviewQuery.data;
  const overviewPending = overviewQuery.isPending;

  // Calculate completion rate percentage
  const completionRate = stats?.completionRate ? `${stats.completionRate}%` : '0%';

  // Features available based on role
  const features = [
    {
      title: 'Lista rozliczeń',
      description: 'Przeglądaj i zarządzaj rozliczeniami klientów',
      icon: List,
      href: `${basePath}/list`,
      gradient: 'bg-primary',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE],
    },
    {
      title: 'Zarządzanie zespołem',
      description: 'Przypisywanie klientów, statystyki pracowników',
      icon: Users,
      href: `${basePath}/team`,
      gradient: 'bg-primary/80',
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
        <h1 className="text-foreground flex items-center gap-3 text-3xl font-bold">
          Moduł Rozliczenia
          <div className="bg-accent h-3 w-3 rounded-full" />
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
          iconBg="bg-primary"
          valueColor="text-foreground"
          borderColor="border-border"
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
          label="Brakująca weryfikacja faktury"
          value={stats?.missingInvoiceVerification ?? 0}
          icon={FileQuestion}
          iconBg="bg-orange-500"
          valueColor="text-orange-600"
          borderColor="border-orange-200"
          isLoading={isPending}
        />

        <StatCard
          label="Brakująca faktura"
          value={stats?.missingInvoice ?? 0}
          icon={FileX}
          iconBg="bg-red-500"
          valueColor="text-red-600"
          borderColor="border-red-200"
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
          iconBg="bg-accent"
          valueColor="text-accent"
          borderColor="border-border"
          isLoading={isPending}
        />

        {showForOwner && overviewStats && (
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

      {/* Status Chart */}
      {showForOwner && !overviewPending && overviewStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status rozliczeń</CardTitle>
          </CardHeader>
          <CardContent>
            <SettlementsStatusChart
              pending={overviewStats.pending ?? 0}
              inProgress={overviewStats.inProgress ?? 0}
              missingInvoiceVerification={overviewStats.missingInvoiceVerification ?? 0}
              missingInvoice={overviewStats.missingInvoice ?? 0}
              completed={overviewStats.completed ?? 0}
            />
          </CardContent>
        </Card>
      )}

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

      {/* Extended Stats - only for admin/owner */}
      {showForOwner && (
        <div className="space-y-4">
          <h2 className="text-foreground text-xl font-semibold">Rozszerzone statystyki</h2>
          <ExtendedSettlementStats />
        </div>
      )}
    </div>
  );
}
