import { Link } from 'react-router-dom';

import {
  AlertTriangle,
  Calculator,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useZusStatistics, useZusUpcomingPayments } from '@/lib/hooks/use-zus';
import {
  ZusContributionStatusColors,
  ZusContributionStatusLabels,
  type ZusContributionStatus,
} from '@/types/enums';

export default function ZusDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useZusStatistics();
  const { data: upcoming, isLoading: upcomingLoading } = useZusUpcomingPayments(30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Moduł ZUS
          </h1>
          <p className="text-muted-foreground">Zarządzanie rozliczeniami składek ZUS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="settings">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia
            </Link>
          </Button>
          <Button asChild>
            <Link to="contributions/create">
              <Calculator className="mr-2 h-4 w-4" />
              Oblicz składki
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="contributions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rozliczenia</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Przeglądaj i zarządzaj rozliczeniami ZUS
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="contributions/create">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kalkulator</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Oblicz składki dla klienta</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="settings">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ustawienia</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Konfiguruj stawki i ulgi</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="reports">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raporty</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Generuj raporty i eksporty</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wszystkie rozliczenia</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalContributions ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.clientsWithSettings ?? 0} klientów z ustawieniami ZUS
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opłacone</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.totalPaidAmountPln ?? '0,00'} PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.paidContributions ?? 0} rozliczeń
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.totalPendingAmountPln ?? '0,00'} PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingContributions ?? 0} rozliczeń
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Przeterminowane</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.totalOverdueAmountPln ?? '0,00'} PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.overdueContributions ?? 0} rozliczeń
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Nadchodzące płatności
          </CardTitle>
          <CardDescription>
            Rozliczenia ZUS z terminem płatności w najbliższych 30 dniach
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : upcoming && upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.slice(0, 10).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Link
                        to={`contributions/${payment.id}`}
                        className="font-medium hover:underline"
                      >
                        {payment.clientName}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {payment.periodMonth}/{payment.periodYear} • Termin:{' '}
                        {new Date(payment.dueDate).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{payment.totalAmountPln} PLN</p>
                      {payment.isOverdue ? (
                        <Badge variant="destructive" className="text-xs">
                          Przeterminowane
                        </Badge>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {payment.daysUntilDue === 0
                            ? 'Dzisiaj'
                            : payment.daysUntilDue === 1
                              ? 'Jutro'
                              : `Za ${payment.daysUntilDue} dni`}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`contributions/${payment.id}`}>Szczegóły</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {upcoming.length > 10 && (
                <div className="pt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link to="contributions">Zobacz wszystkie ({upcoming.length})</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
              <p>Brak nadchodzących płatności</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Podsumowanie statusów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-lg border p-4">
                  <Badge className={ZusContributionStatusColors[status as ZusContributionStatus]}>
                    {ZusContributionStatusLabels[status as ZusContributionStatus]}
                  </Badge>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
