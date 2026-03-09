import { Building2, Settings, UserCheck, Users, UserX } from 'lucide-react';

import { ClientsTypeChart } from '@/components/dashboard/charts/clients-type-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { type ClientTaskTimeStatsDto } from '@/lib/api/endpoints/clients';
import { useClientStatistics, useClientTaskTimeStats } from '@/lib/hooks/use-clients';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { isOwnerOrAdmin } from '@/lib/utils/user';
import { UserRole } from '@/types/enums';

export default function ClientsDashboardPage() {
  const { user } = useAuthContext();
  const { data, isPending } = useClientStatistics();
  const basePath = useModuleBasePath('clients');

  const totalClients = data?.total ?? 0;
  const activeClients = data?.active ?? 0;
  const inactiveClients = data?.inactive ?? 0;

  // Features available based on role
  const features = [
    {
      title: 'Lista klientów',
      description: 'Przeglądaj, dodawaj i zarządzaj klientami biura rachunkowego',
      icon: Users,
      href: `${basePath}/list`,
      gradient: 'bg-primary',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE],
    },
    {
      title: 'Ustawienia modułu',
      description: 'Pola niestandardowe, ikony klientów, powiadomienia',
      icon: Settings,
      href: `${basePath}/settings`,
      gradient: 'bg-primary',
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
          Moduł Klienci
          <div className="bg-accent h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">Zarządzanie klientami biura rachunkowego</p>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-6">
        <StatCard
          label="Wszyscy klienci"
          value={totalClients}
          icon={Building2}
          iconBg="bg-primary"
          valueColor="text-foreground"
          borderColor="border-accent/30"
          isLoading={isPending}
        />

        <StatCard
          label="Aktywni"
          value={activeClients}
          icon={UserCheck}
          iconBg="bg-green-500"
          valueColor="text-green-600"
          borderColor="border-green-200"
          isLoading={isPending}
        />

        <StatCard
          label="Nieaktywni"
          value={inactiveClients}
          icon={UserX}
          iconBg="bg-orange-500"
          valueColor="text-orange-600"
          borderColor="border-orange-200"
          isLoading={isPending}
        />
      </div>

      {/* Employment Type Chart */}
      {!isPending && data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Typy zatrudnienia</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsTypeChart
              byEmploymentType={data.byEmploymentType as Record<string, number>}
              total={totalClients}
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

      {/* Client Task and Time Statistics - admin/owner only */}
      {isOwnerOrAdmin(user) && (
        <ClientTaskTimeStatsSection />
      )}
    </div>
  );
}

function ClientTaskTimeStatsSection() {
  const { data, isLoading } = useClientTaskTimeStats();

  if (isLoading) return null;
  if (!data?.length) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Statystyki zadań i czasu per klient</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.slice(0, 15).map((client: ClientTaskTimeStatsDto) => (
            <div
              key={client.clientId}
              className="flex items-center justify-between py-1 border-b last:border-0"
            >
              <span className="text-sm font-medium">{client.clientName}</span>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Zadania: {client.completedTasks}/{client.totalTasks}
                </span>
                <span>Czas: {client.totalHours}h</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
