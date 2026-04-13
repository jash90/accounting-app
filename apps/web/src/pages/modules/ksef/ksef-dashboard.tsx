import { AlertTriangle, ArrowRight, FileText, Radio, Receipt, RefreshCw, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/common/page-header';
import { KsefSessionExpiryBanner } from './components/ksef-session-expiry-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKsefConfig, useKsefDashboardStats, useKsefActiveSession } from '@/lib/hooks/use-ksef';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { formatDate } from '@/lib/utils/format-date';
import { KsefEnvironment, KsefEnvironmentLabels } from '@/types/enums';

const formatPLN = (amount: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);

function StatCard({ title, value, color, isPending }: { title: string; value: number; color?: string; isPending: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {isPending ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color ?? ''}`}>{value}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function KsefDashboardPage() {
  const basePath = useModuleBasePath('ksef');
  const { hasManagePermission } = useModulePermissions('ksef');
  const { data: config, isPending: configPending } = useKsefConfig();
  const { data: stats, isPending: statsPending } = useKsefDashboardStats();
  const { data: activeSession } = useKsefActiveSession();

  const isConfigured = !configPending && config && typeof config === 'object' && 'id' in config;

  const quickLinks = [
    { label: 'Faktury', icon: FileText, href: `${basePath}/invoices`, show: true },
    { label: 'Sesje', icon: Radio, href: `${basePath}/sessions`, show: true },
    { label: 'Synchronizacja', icon: RefreshCw, href: `${basePath}/sync`, show: true },
    { label: 'Ustawienia', icon: Settings, href: `${basePath}/settings`, show: hasManagePermission },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="KSeF"
        description="Krajowy System e-Faktur — panel główny"
        icon={<Receipt className="h-6 w-6" />}
      />

      <KsefSessionExpiryBanner />

      {isConfigured && config && 'environment' in config && (
        <Badge
          variant={config.environment === KsefEnvironment.PRODUCTION ? 'default' : 'outline'}
          className={
            config.environment === KsefEnvironment.TEST ? 'border-yellow-500 text-yellow-600' :
            config.environment === KsefEnvironment.DEMO ? 'border-blue-500 text-blue-600' : ''
          }
        >
          {KsefEnvironmentLabels[config.environment as KsefEnvironment] ?? config.environment}
        </Badge>
      )}

      {!configPending && !isConfigured && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            KSeF nie jest skonfigurowany.{' '}
            <Link to={`${basePath}/settings`} className="font-medium underline">
              Przejdź do ustawień
            </Link>{' '}
            aby skonfigurować połączenie.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard title="Wszystkie faktury" value={stats?.totalInvoices ?? 0} isPending={statsPending} />
        <StatCard title="Szkice" value={stats?.draftCount ?? 0} isPending={statsPending} />
        <StatCard title="Oczekujące" value={stats?.pendingCount ?? 0} color="text-yellow-600" isPending={statsPending} />
        <StatCard title="Zaakceptowane" value={stats?.acceptedCount ?? 0} color="text-green-600" isPending={statsPending} />
        <StatCard title="Odrzucone" value={stats?.rejectedCount ?? 0} color="text-red-600" isPending={statsPending} />
        <StatCard title="Błędy" value={stats?.errorCount ?? 0} color="text-orange-600" isPending={statsPending} />
      </div>

      {isConfigured && !statsPending && stats?.totalInvoices === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Brak faktur.{' '}
              <Link to={`${basePath}/invoices`} className="font-medium text-primary underline">Utwórz pierwszą fakturę</Link>
              {' '}lub{' '}
              <Link to={`${basePath}/sync`} className="font-medium text-primary underline">zsynchronizuj dane z KSeF</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Łączna kwota netto</p>
            {statsPending ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatPLN(stats?.totalNetAmount ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Łączna kwota brutto</p>
            {statsPending ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatPLN(stats?.totalGrossAmount ?? 0)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Ostatnia synchronizacja: {stats?.lastSyncAt ? formatDate(stats.lastSyncAt) : 'Nigdy nie synchronizowano'}
      </p>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${activeSession ? 'bg-green-500' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium">{activeSession ? 'Aktywna sesja KSeF' : 'Brak aktywnej sesji'}</p>
              {activeSession && (
                <p className="text-sm text-muted-foreground">
                  Faktury w sesji: {activeSession.invoiceCount}
                  {activeSession.expiresAt && (
                    <span className="ml-2">(wygasa: {formatDate(activeSession.expiresAt)})</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickLinks
          .filter((l) => l.show)
          .map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between pt-6">
                  <div className="flex items-center gap-3">
                    <link.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{link.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
