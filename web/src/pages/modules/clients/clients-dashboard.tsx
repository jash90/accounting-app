import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Settings, ArrowRight, UserCheck, UserX, Building2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/auth-context';
import { useClients } from '@/lib/hooks/use-clients';
import { UserRole } from '@/types/enums';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientsDashboardPage() {
  const { user } = useAuthContext();
  const { data: clients = [], isPending } = useClients();

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
      gradient: 'bg-apptax-gradient',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE],
    },
    {
      title: 'Ustawienia modułu',
      description: 'Pola niestandardowe, ikony klientów, powiadomienia',
      icon: Settings,
      href: `${basePath}/settings`,
      gradient: 'bg-apptax-dark-gradient',
      roles: [UserRole.ADMIN, UserRole.COMPANY_OWNER],
    },
  ];

  // Filter features based on user role
  const availableFeatures = features.filter(
    (feature) => user?.role && feature.roles.includes(user.role)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Moduł Klienci
          <div className="w-3 h-3 rounded-full bg-apptax-teal" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarządzanie klientami biura rachunkowego
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-apptax-soft-teal/30">
          <CardHeader className="pb-2">
            <CardDescription>Wszyscy klienci</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-apptax-gradient text-white">
                <Building2 className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-apptax-navy">{totalClients}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>Aktywni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <UserCheck className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-green-600">{activeClients}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription>Nieaktywni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500 text-white">
                <UserX className="h-5 w-5" />
              </div>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-3xl font-bold text-orange-600">{inactiveClients}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {availableFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="hover:shadow-apptax-md transition-all duration-200 hover:border-apptax-blue"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${feature.gradient} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-apptax-navy">{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={feature.href}>
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
    </div>
  );
}
