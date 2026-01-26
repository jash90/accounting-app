import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';
import { Building2, Settings, UserCheck, Users, UserX } from 'lucide-react';
import { useClients } from '@/lib/hooks/use-clients';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';

export default function ClientsDashboardPage() {
  const { user } = useAuthContext();
  const { data, isPending } = useClients();

  // Extract clients array from paginated response
  const clients = data?.data ?? [];

  // Calculate statistics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.isActive).length;
  const inactiveClients = clients.filter((c) => !c.isActive).length;

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/clients';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/clients';
      default:
        return '/modules/clients';
    }
  };

  const basePath = getBasePath();

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
