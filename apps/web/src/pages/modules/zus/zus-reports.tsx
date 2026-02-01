import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  PieChart,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useExportZusContributions,
  useZusMonthlyComparison,
  useZusMonthTotals,
  useZusStatistics,
  useZusTopClients,
  useZusYearTotals,
} from '@/lib/hooks/use-zus';
import {
  UserRole,
  ZusContributionStatus,
  ZusContributionStatusColors,
  ZusContributionStatusLabels,
} from '@/types/enums';

// Chart colors
const CHART_COLORS = {
  social: '#3b82f6', // blue-500
  health: '#10b981', // emerald-500
  total: '#8b5cf6', // violet-500
};

const STATUS_COLORS: Record<ZusContributionStatus, string> = {
  [ZusContributionStatus.DRAFT]: '#94a3b8',
  [ZusContributionStatus.CALCULATED]: '#3b82f6',
  [ZusContributionStatus.PAID]: '#22c55e',
  [ZusContributionStatus.OVERDUE]: '#ef4444',
};

export default function ZusReportsPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Date filters for export
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportStatus, setExportStatus] = useState<string>('all');

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useZusStatistics();
  const { data: monthTotals, isLoading: monthTotalsLoading } = useZusMonthTotals();
  const { data: yearTotals, isLoading: yearTotalsLoading } = useZusYearTotals();
  const { data: monthlyComparison, isLoading: comparisonLoading } = useZusMonthlyComparison(12);
  const { data: topClients, isLoading: topClientsLoading } = useZusTopClients(10);

  const exportMutation = useExportZusContributions();

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/zus';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/zus';
      default:
        return '/modules/zus';
    }
  };

  const basePath = getBasePath();

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const setCurrentMonth = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const handleExportAll = () => {
    exportMutation.mutate(undefined);
  };

  const handleExportFiltered = () => {
    const filters: { status?: ZusContributionStatus } = {};
    if (exportStatus !== 'all') {
      filters.status = exportStatus as ZusContributionStatus;
    }
    exportMutation.mutate(filters);
  };

  // Prepare chart data for monthly trend
  const monthlyChartData =
    monthlyComparison?.map((m) => ({
      name: m.periodLabel.split(' ')[0].substring(0, 3), // First 3 letters of month
      social: m.totalSocialAmount / 100, // Convert grosze to PLN
      health: m.totalHealthAmount / 100,
      total: m.totalAmount / 100,
    })) ?? [];

  // Prepare chart data for status distribution
  const statusChartData = stats
    ? Object.entries(stats.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: ZusContributionStatusLabels[status as ZusContributionStatus],
          value: count,
          color: STATUS_COLORS[status as ZusContributionStatus],
        }))
    : [];

  // Prepare chart data for top clients
  const topClientsChartData =
    topClients?.map((c) => ({
      name: c.clientName.length > 15 ? c.clientName.substring(0, 15) + '...' : c.clientName,
      amount: c.totalAmount / 100,
      fullName: c.clientName,
    })) ?? [];

  const isLoading = statsLoading || monthTotalsLoading || yearTotalsLoading;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Raporty ZUS"
        description="Statystyki, wykresy i eksport danych składek ZUS"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bieżący miesiąc</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthTotals?.totalAmountPln ?? '0,00'} PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthTotals?.contributionsCount ?? 0} rozliczeń
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bieżący rok</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{yearTotals?.totalAmountPln ?? '0,00'} PLN</div>
                <p className="text-xs text-muted-foreground">
                  {yearTotals?.contributionsCount ?? 0} rozliczeń
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
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {(
                    ((stats?.totalPendingAmount ?? 0) + (stats?.totalOverdueAmount ?? 0)) /
                    100
                  ).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}{' '}
                  PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.pendingContributions ?? 0) + (stats?.overdueContributions ?? 0)}{' '}
                  rozliczeń
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend miesięczny
            </CardTitle>
            <CardDescription>Składki ZUS z ostatnich 12 miesięcy</CardDescription>
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <Skeleton className="h-[300px]" />
            ) : monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' PLN'
                    }
                    labelFormatter={(label) => `Miesiąc: ${label}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="social"
                    name="Składki społeczne"
                    fill={CHART_COLORS.social}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="health"
                    name="Składka zdrowotna"
                    fill={CHART_COLORS.health}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Brak danych do wyświetlenia
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Rozkład statusów
            </CardTitle>
            <CardDescription>Rozliczenia według statusu</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px]" />
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Brak danych do wyświetlenia
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 10 klientów
          </CardTitle>
          <CardDescription>Klienci z największymi składkami ZUS</CardDescription>
        </CardHeader>
        <CardContent>
          {topClientsLoading ? (
            <Skeleton className="h-[350px]" />
          ) : topClientsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topClientsChartData} layout="vertical" margin={{ left: 20 }}>
                <XAxis
                  type="number"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString('pl-PL')} PLN`}
                />
                <YAxis type="category" dataKey="name" fontSize={12} width={120} />
                <Tooltip
                  formatter={(value: number) =>
                    value.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' PLN'
                  }
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                />
                <Bar
                  dataKey="amount"
                  name="Suma składek"
                  fill={CHART_COLORS.total}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[350px] items-center justify-center text-muted-foreground">
              Brak danych do wyświetlenia
            </div>
          )}

          {/* Top Clients List */}
          {topClients && topClients.length > 0 && (
            <div className="mt-6 space-y-2">
              {topClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{client.clientName}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">
                      {client.contributionsCount} rozliczeń
                    </span>
                    <span className="w-28 text-right font-semibold">
                      {client.totalAmountPln} PLN
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Eksport raportów
          </CardTitle>
          <CardDescription>Eksportuj dane składek ZUS do pliku CSV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export All */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h4 className="font-medium">Eksportuj wszystkie rozliczenia</h4>
              <p className="text-sm text-muted-foreground">
                Pobierz pełną listę wszystkich rozliczeń ZUS
              </p>
            </div>
            <Button onClick={handleExportAll} disabled={exportMutation.isPending}>
              <FileText className="mr-2 h-4 w-4" />
              Eksportuj CSV
            </Button>
          </div>

          {/* Export with Filters */}
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Eksport z filtrami</h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Data od</Label>
                <DatePicker
                  value={startDate}
                  onChange={(value) => setStartDate(value || '')}
                  placeholder="Data początkowa"
                />
              </div>
              <div className="space-y-2">
                <Label>Data do</Label>
                <DatePicker
                  value={endDate}
                  onChange={(value) => setEndDate(value || '')}
                  placeholder="Data końcowa"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={exportStatus} onValueChange={setExportStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {Object.entries(ZusContributionStatusLabels).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={ZusContributionStatusColors[status as ZusContributionStatus]}
                          >
                            {label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleExportFiltered}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Eksportuj
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                Ostatnie 7 dni
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                Ostatnie 30 dni
              </Button>
              <Button variant="outline" size="sm" onClick={setCurrentMonth}>
                Bieżący miesiąc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Szczegółowe statystyki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Badge className={ZusContributionStatusColors[status as ZusContributionStatus]}>
                      {ZusContributionStatusLabels[status as ZusContributionStatus]}
                    </Badge>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Łącznie rozliczeń</p>
                <p className="text-3xl font-bold">{stats.totalContributions}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Klienci z ustawieniami ZUS</p>
                <p className="text-3xl font-bold">{stats.clientsWithSettings}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Suma wszystkich składek</p>
                <p className="text-3xl font-bold">
                  {(
                    (stats.totalPaidAmount + stats.totalPendingAmount + stats.totalOverdueAmount) /
                    100
                  ).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}{' '}
                  PLN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
