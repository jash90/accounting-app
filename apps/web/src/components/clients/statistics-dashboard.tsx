import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Users, UserCheck, UserX, TrendingUp, Clock, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  type EmploymentType,
  type VatStatus,
  type TaxScheme,
  type ZusStatus,
} from '@/types/enums';

interface RecentClient {
  id: string;
  name: string;
  nip?: string;
  email?: string;
  employmentType?: EmploymentType;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  entityId: string;
  action: string;
  entityName: string;
  changedByName?: string;
  createdAt: string;
}

interface ClientStatistics {
  total: number;
  active: number;
  inactive: number;
  byEmploymentType: Record<EmploymentType, number>;
  byVatStatus: Record<VatStatus, number>;
  byTaxScheme: Record<TaxScheme, number>;
  byZusStatus: Record<ZusStatus, number>;
  addedThisMonth: number;
  addedLast30Days: number;
  recentlyAdded?: RecentClient[];
  recentActivity?: RecentActivity[];
}

interface StatisticsDashboardProps {
  statistics?: ClientStatistics | null;
  isLoading?: boolean;
  onClientClick?: (clientId: string) => void;
}

export function StatisticsDashboard({
  statistics,
  isLoading = false,
  onClientClick,
}: StatisticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) return null;

  const actionLabels: Record<string, string> = {
    CREATE: 'Utworzono',
    UPDATE: 'Zaktualizowano',
    DELETE: 'Usunięto',
    RESTORE: 'Przywrócono',
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszyscy klienci</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">W bazie danych</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywni</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.total > 0 ? Math.round((statistics.active / statistics.total) * 100) : 0}%
              wszystkich
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nieaktywni</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.inactive}</div>
            <p className="text-xs text-muted-foreground">Dezaktywowani</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nowi (30 dni)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.addedLast30Days}</div>
            <p className="text-xs text-muted-foreground">
              W tym miesiącu: {statistics.addedThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Według zatrudnienia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statistics.byEmploymentType)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {EmploymentTypeLabels[type as EmploymentType] || type}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              {Object.values(statistics.byEmploymentType).every((v) => v === 0) && (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Według VAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statistics.byVatStatus)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {VatStatusLabels[status as VatStatus] || status}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              {Object.values(statistics.byVatStatus).every((v) => v === 0) && (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Według opodatkowania</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statistics.byTaxScheme)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([scheme, count]) => (
                  <div key={scheme} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {TaxSchemeLabels[scheme as TaxScheme] || scheme}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              {Object.values(statistics.byTaxScheme).every((v) => v === 0) && (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Według ZUS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statistics.byZusStatus)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {ZusStatusLabels[status as ZusStatus] || status}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              {Object.values(statistics.byZusStatus).every((v) => v === 0) && (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {statistics.recentlyAdded && statistics.recentlyAdded.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ostatnio dodani</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.recentlyAdded.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                    onClick={() => onClientClick?.(client.id)}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.nip || client.email || 'Brak danych kontaktowych'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(client.createdAt), 'd MMM', { locale: pl })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {statistics.recentActivity && statistics.recentActivity.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ostatnia aktywność</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                    onClick={() => onClientClick?.(activity.entityId)}
                  >
                    <div>
                      <p className="font-medium">{activity.entityName}</p>
                      <p className="text-xs text-muted-foreground">
                        {actionLabels[activity.action] || activity.action}
                        {activity.changedByName && ` przez ${activity.changedByName}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.createdAt), 'd MMM HH:mm', { locale: pl })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
