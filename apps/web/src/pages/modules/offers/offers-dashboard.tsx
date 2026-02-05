import { useMemo } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FileType,
  Settings,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NavigationCard } from '@/components/ui/navigation-card';
import { StatCard } from '@/components/ui/stat-card';
import { useAuthContext } from '@/contexts/auth-context';
import { useDashboardStatistics } from '@/lib/hooks/use-offers';
import { UserRole } from '@/types/enums';

export default function OffersDashboardPage() {
  const { user } = useAuthContext();
  // Use parallel queries hook instead of sequential queries
  const { offerStats, leadStats, offersLoading, leadsLoading, isError } = useDashboardStatistics();

  const basePath = useMemo(() => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/offers';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/offers';
      default:
        return '/modules/offers';
    }
  }, [user?.role]);

  const views = useMemo(
    () => [
      {
        title: 'Lista ofert',
        description: 'Przeglądaj i zarządzaj wszystkimi ofertami w systemie',
        icon: FileText,
        href: `${basePath}/list`,
        gradient: 'bg-apptax-gradient',
      },
      {
        title: 'Leady',
        description: 'Zarządzaj potencjalnymi klientami i procesem sprzedaży',
        icon: Users,
        href: `${basePath}/leads`,
        gradient: 'bg-apptax-dark-gradient',
      },
      {
        title: 'Szablony',
        description: 'Twórz i edytuj szablony ofert z domyślnymi ustawieniami',
        icon: FileType,
        href: `${basePath}/templates`,
        gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
      },
    ],
    [basePath]
  );

  const showSettings = user?.role === UserRole.ADMIN || user?.role === UserRole.COMPANY_OWNER;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Moduł Oferty
          <div className="bg-apptax-teal h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Zarządzanie ofertami handlowymi i procesem sprzedaży
        </p>
      </div>

      {/* Error Alert */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Błąd ładowania</AlertTitle>
          <AlertDescription>
            Nie udało się załadować statystyk. Spróbuj odświeżyć stronę.
          </AlertDescription>
        </Alert>
      )}

      {/* Offer Statistics */}
      <div className="space-y-3">
        <h2 className="text-apptax-navy text-lg font-semibold">Statystyki ofert</h2>
        <div className="flex flex-wrap gap-6">
          <StatCard
            label="Wszystkie oferty"
            value={offerStats?.totalOffers ?? 0}
            icon={FileText}
            iconBg="bg-apptax-gradient"
            valueColor="text-apptax-navy"
            borderColor="border-apptax-soft-teal/30"
            isLoading={offersLoading}
          />
          <StatCard
            label="Wysłane"
            value={offerStats?.sentCount ?? 0}
            icon={Clock}
            iconBg="bg-purple-500"
            valueColor="text-purple-600"
            borderColor="border-purple-200"
            isLoading={offersLoading}
          />
          <StatCard
            label="Zaakceptowane"
            value={offerStats?.acceptedCount ?? 0}
            icon={CheckCircle2}
            iconBg="bg-green-500"
            valueColor="text-green-600"
            borderColor="border-green-200"
            isLoading={offersLoading}
          />
          <StatCard
            label="Odrzucone"
            value={offerStats?.rejectedCount ?? 0}
            icon={XCircle}
            iconBg="bg-red-500"
            valueColor="text-red-600"
            borderColor="border-red-200"
            isLoading={offersLoading}
          />
        </div>
      </div>

      {/* Lead Statistics */}
      <div className="space-y-3">
        <h2 className="text-apptax-navy text-lg font-semibold">Statystyki leadów</h2>
        <div className="flex flex-wrap gap-6">
          <StatCard
            label="Wszystkie leady"
            value={leadStats?.totalLeads ?? 0}
            icon={Users}
            iconBg="bg-apptax-dark-gradient"
            valueColor="text-apptax-navy"
            borderColor="border-apptax-soft-teal/30"
            isLoading={leadsLoading}
          />
          <StatCard
            label="Nowe"
            value={leadStats?.newCount ?? 0}
            icon={TrendingUp}
            iconBg="bg-blue-500"
            valueColor="text-blue-600"
            borderColor="border-blue-200"
            isLoading={leadsLoading}
          />
          <StatCard
            label="Przekonwertowane"
            value={leadStats?.convertedCount ?? 0}
            icon={CheckCircle2}
            iconBg="bg-green-500"
            valueColor="text-green-600"
            borderColor="border-green-200"
            isLoading={leadsLoading}
          />
          <StatCard
            label="Konwersja"
            value={`${((leadStats?.conversionRate ?? 0) * 100).toFixed(1)}%`}
            icon={TrendingUp}
            iconBg="bg-orange-500"
            valueColor="text-orange-600"
            borderColor="border-orange-200"
            isLoading={leadsLoading}
          />
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="flex flex-wrap gap-6">
        {views.map((view) => (
          <NavigationCard
            key={view.title}
            title={view.title}
            description={view.description}
            icon={view.icon}
            href={view.href}
            gradient={view.gradient}
            className="flex-1 flex-shrink-0"
          />
        ))}
      </div>

      {/* Settings Card */}
      {showSettings && (
        <NavigationCard
          title="Ustawienia modułu"
          description="Zarządzaj szablonami, ustawieniami numeracji i domyślnymi wartościami"
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
