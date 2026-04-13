import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { KsefAuditLog, KsefAuditLogFilters } from '@/lib/api/endpoints/ksef';
import { useKsefAuditLogs } from '@/lib/hooks/use-ksef';
import { formatDate } from '@/lib/utils/format-date';

const LazyDataTable = lazy(() =>
  import('@/components/common/data-table').then((m) => ({ default: m.DataTable }))
);

const formatTime = (date: string) => {
  try {
    return new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '-';
  }
};

export default function KsefAuditLogPage() {
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<KsefAuditLogFilters>({ page: 1, limit: 20 });
  const { data, isPending } = useKsefAuditLogs(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, action: searchValue || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const columns = useMemo<ColumnDef<KsefAuditLog>[]>(
    () => [
      {
        accessorKey: 'action',
        header: 'Akcja',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: 'entityType',
        header: 'Typ',
        cell: ({ row }) => <span className="text-sm">{row.original.entityType || '-'}</span>,
      },
      {
        id: 'user',
        header: 'Użytkownik',
        cell: ({ row }) => {
          const u = row.original.user;
          const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;
          return <span className="text-sm">{name}</span>;
        },
      },
      {
        id: 'http',
        header: 'HTTP',
        cell: ({ row }) => {
          const { httpMethod, httpStatusCode } = row.original;
          if (!httpMethod) return <span className="text-muted-foreground">-</span>;
          const isError = httpStatusCode && httpStatusCode >= 400;
          return (
            <span className={`font-mono text-xs ${isError ? 'text-red-600' : ''}`}>
              {httpMethod} {httpStatusCode}
            </span>
          );
        },
      },
      {
        accessorKey: 'durationMs',
        header: 'Czas',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.durationMs != null ? `${row.original.durationMs}ms` : '-'}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Data',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{formatDate(row.original.createdAt)}</div>
            <div className="text-xs text-muted-foreground">{formatTime(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'errorMessage',
        header: 'Błąd',
        cell: ({ row }) => {
          const msg = row.original.errorMessage;
          if (!msg) return <span className="text-muted-foreground">-</span>;
          return <span className="max-w-48 truncate text-xs text-red-600" title={msg}>{msg}</span>;
        },
      },
    ],
    []
  );

  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dziennik audytu KSeF"
        description="Historia operacji w Krajowym Systemie e-Faktur"
        icon={<ScrollText className="h-6 w-6" />}
      />

      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Szukaj po akcji..."
          className="max-w-xs"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Select
          value={filters.entityType || 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, entityType: v === 'all' ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="SESSION">Sesja</SelectItem>
            <SelectItem value="INVOICE">Faktura</SelectItem>
            <SelectItem value="CONFIG">Konfiguracja</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={filters.dateFrom || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined, page: 1 }))}
        />
        <Input
          type="date"
          className="w-40"
          value={filters.dateTo || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined, page: 1 }))}
        />
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LazyDataTable columns={columns} data={logs} isLoading={isPending} enablePagination pageSize={20} />
      </Suspense>
    </div>
  );
}
