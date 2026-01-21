import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useTaskClients } from '@/lib/hooks/use-tasks';
import {
  useTimeSummaryReport,
  useTimeByClientReport,
  useExportTimeReport,
} from '@/lib/hooks/use-time-tracking';
import { UserRole } from '@/types/enums';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function TimeTrackingReportsPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState<'client' | 'user' | 'project'>('client');
  const [clientId, setClientId] = useState<string>('');

  const { data: summaryReport, isPending: summaryLoading } = useTimeSummaryReport({
    startDate,
    endDate,
    groupBy,
  });

  const { data: clientReport, isPending: clientLoading } = useTimeByClientReport({
    startDate,
    endDate,
    clientId: clientId || undefined,
  });

  const { data: clientsData } = useTaskClients();
  const exportReport = useExportTimeReport();

  const clients = clientsData || [];

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/time-tracking';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/time-tracking';
      default:
        return '/modules/time-tracking';
    }
  };

  const basePath = getBasePath();

  const handleExport = (format: 'csv' | 'excel') => {
    exportReport.mutate({
      startDate,
      endDate,
      format,
      clientId: clientId || undefined,
    });
  };

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Raporty"
        description="Generuj raporty rozliczeniowe i eksportuj dane"
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtry raportu</CardTitle>
          <CardDescription>Określ zakres dat i kryteria raportu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data od</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data do</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Grupuj według</Label>
              <Select
                value={groupBy}
                onValueChange={(value) => setGroupBy(value as 'client' | 'user' | 'project')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Klient</SelectItem>
                  <SelectItem value="user">Użytkownik</SelectItem>
                  <SelectItem value="project">Projekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Klient (opcjonalnie)</Label>
              <Select
                value={clientId || '__all__'}
                onValueChange={(value) => setClientId(value === '__all__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wszyscy klienci" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Wszyscy klienci</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
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
        </CardContent>
      </Card>

      {/* Summary Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Podsumowanie
            </CardTitle>
            <CardDescription>
              Raport za okres {format(new Date(startDate), 'd MMMM yyyy', { locale: pl })} -{' '}
              {format(new Date(endDate), 'd MMMM yyyy', { locale: pl })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportReport.isPending}
            >
              <FileText className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exportReport.isPending}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : summaryReport ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Czas całkowity</span>
                  </div>
                  <p className="text-2xl font-mono font-semibold">
                    {formatDuration(summaryReport.totalMinutes)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Rozliczalny</span>
                  </div>
                  <p className="text-2xl font-mono font-semibold">
                    {formatDuration(summaryReport.billableMinutes)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Kwota</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {summaryReport.totalAmount.toLocaleString('pl-PL')} PLN
                  </p>
                </div>
              </div>

              {/* Breakdown by Client */}
              {summaryReport.byClient && summaryReport.byClient.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Podział według klientów
                  </h4>
                  <div className="space-y-2">
                    {summaryReport.byClient.map(
                      (
                        item: {
                          clientId: string;
                          clientName: string;
                          totalMinutes: number;
                          totalAmount: number;
                        },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <span>{item.clientName || 'Bez przypisania'}</span>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="font-mono">{formatDuration(item.totalMinutes)}</span>
                            <span className="text-muted-foreground w-16 text-right">
                              {Math.round(
                                (item.totalMinutes / (summaryReport.totalMinutes || 1)) * 100
                              )}
                              %
                            </span>
                            <span className="font-semibold w-24 text-right">
                              {item.totalAmount.toLocaleString('pl-PL')} PLN
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Brak danych dla wybranego okresu
            </p>
          )}
        </CardContent>
      </Card>

      {/* Client Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Raport wg klientów
          </CardTitle>
          <CardDescription>Szczegółowy podział czasu i kosztów według klientów</CardDescription>
        </CardHeader>
        <CardContent>
          {clientLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : clientReport && clientReport.length > 0 ? (
            <div className="space-y-2">
              {clientReport.map((client) => (
                <div
                  key={client.clientId || 'no-client'}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                >
                  <div>
                    <h4 className="font-medium">{client.clientName || 'Bez klienta'}</h4>
                    <p className="text-sm text-muted-foreground">{client.entryCount} wpisów</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatDuration(client.totalMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(client.billableMinutes)} rozliczalnego
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="font-semibold">
                        {client.totalAmount.toLocaleString('pl-PL')} PLN
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Brak danych dla wybranego okresu
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
