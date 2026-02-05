import { memo, useMemo } from 'react';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Activity, Clock, TrendingUp, UserCheck, Users, UserX } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
  type EmploymentType,
  type TaxScheme,
  type VatStatus,
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

/** Action type labels - defined outside component to prevent recreation on each render */
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Utworzono',
  UPDATE: 'Zaktualizowano',
  DELETE: 'Usunięto',
  RESTORE: 'Przywrócono',
};

/**
 * Statistics dashboard component wrapped in memo() for performance.
 * Only re-renders when statistics, isLoading, or onClientClick change.
 */
export const StatisticsDashboard = memo(function StatisticsDashboard({
  statistics,
  isLoading = false,
  onClientClick,
}: StatisticsDashboardProps) {
  // Memoize expensive array transforms to prevent recreation on every render
  // These filter().sort().slice() chains would otherwise run 4 times per render
  const byEmploymentType = statistics?.byEmploymentType;
  const sortedEmploymentTypes = useMemo(
    () =>
      byEmploymentType
        ? Object.entries(byEmploymentType)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
        : [],
    [byEmploymentType]
  );

  const byVatStatus = statistics?.byVatStatus;
  const sortedVatStatuses = useMemo(
    () =>
      byVatStatus
        ? Object.entries(byVatStatus)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
        : [],
    [byVatStatus]
  );

  const byTaxScheme = statistics?.byTaxScheme;
  const sortedTaxSchemes = useMemo(
    () =>
      byTaxScheme
        ? Object.entries(byTaxScheme)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
        : [],
    [byTaxScheme]
  );

  const byZusStatus = statistics?.byZusStatus;
  const sortedZusStatuses = useMemo(
    () =>
      byZusStatus
        ? Object.entries(byZusStatus)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
        : [],
    [byZusStatus]
  );

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

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszyscy klienci</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-muted-foreground text-xs">W bazie danych</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywni</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
            <p className="text-muted-foreground text-xs">
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
            <p className="text-muted-foreground text-xs">Dezaktywowani</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nowi (30 dni)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.addedLast30Days}</div>
            <p className="text-muted-foreground text-xs">
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
              {sortedEmploymentTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {EmploymentTypeLabels[type as EmploymentType] || type}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {sortedEmploymentTypes.length === 0 && (
                <p className="text-muted-foreground text-sm">Brak danych</p>
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
              {sortedVatStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {VatStatusLabels[status as VatStatus] || status}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {sortedVatStatuses.length === 0 && (
                <p className="text-muted-foreground text-sm">Brak danych</p>
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
              {sortedTaxSchemes.map(([scheme, count]) => (
                <div key={scheme} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground mr-2 truncate">
                    {TaxSchemeLabels[scheme as TaxScheme] || scheme}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {sortedTaxSchemes.length === 0 && (
                <p className="text-muted-foreground text-sm">Brak danych</p>
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
              {sortedZusStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {ZusStatusLabels[status as ZusStatus] || status}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {sortedZusStatuses.length === 0 && (
                <p className="text-muted-foreground text-sm">Brak danych</p>
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
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.recentlyAdded.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm"
                    onClick={() => onClientClick?.(client.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClientClick?.(client.id);
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {client.nip || client.email || 'Brak danych kontaktowych'}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
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
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/50 -mx-2 flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm"
                    onClick={() => onClientClick?.(activity.entityId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClientClick?.(activity.entityId);
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{activity.entityName}</p>
                      <p className="text-muted-foreground text-xs">
                        {ACTION_LABELS[activity.action] || activity.action}
                        {activity.changedByName && ` przez ${activity.changedByName}`}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">
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
});
