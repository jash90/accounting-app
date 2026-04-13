import { lazy, Suspense, useMemo, useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Loader2, Radio } from 'lucide-react';

import { createStatusBadge } from '@/components/common/status-badge';
import { PageHeader } from '@/components/common/page-header';
import { KsefSessionExpiryBanner } from './components/ksef-session-expiry-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { KsefSessionResponse } from '@/lib/api/endpoints/ksef';
import { useKsefActiveSession, useKsefSessions, useOpenKsefSession, useCloseKsefSession } from '@/lib/hooks/use-ksef';
import { formatDate } from '@/lib/utils/format-date';
import {
  KsefSessionStatus,
  KsefSessionStatusLabels,
  KsefSessionStatusColors,
  KsefSessionTypeLabels,
} from '@/types/enums';

const LazyDataTable = lazy(() =>
  import('@/components/common/data-table').then((m) => ({ default: m.DataTable }))
);

const SessionStatusBadge = createStatusBadge<KsefSessionStatus>({
  colors: KsefSessionStatusColors,
  labels: KsefSessionStatusLabels,
});

export default function KsefSessionsPage() {
  const [page, setPage] = useState(1);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string | undefined>();
  const { data: activeSession, isPending: activePending } = useKsefActiveSession();
  const openSession = useOpenKsefSession();
  const closeSession = useCloseKsefSession();

  const { data: sessionsData, isPending: sessionsPending } = useKsefSessions({
    page,
    limit: 20,
    sessionType: sessionTypeFilter,
  });

  const columns = useMemo<ColumnDef<KsefSessionResponse>[]>(
    () => [
      {
        accessorKey: 'sessionType',
        header: 'Typ',
        cell: ({ row }) => (
          <Badge variant="outline">
            {KsefSessionTypeLabels[row.original.sessionType as keyof typeof KsefSessionTypeLabels] ?? row.original.sessionType}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <SessionStatusBadge status={row.original.status as KsefSessionStatus} />,
      },
      {
        accessorKey: 'startedAt',
        header: 'Rozpoczęta',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.startedAt)}</span>,
      },
      {
        accessorKey: 'closedAt',
        header: 'Zamknięta',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.closedAt ? formatDate(row.original.closedAt) : '-'}</span>
        ),
      },
      {
        accessorKey: 'invoiceCount',
        header: 'Faktury',
        cell: ({ row }) => <span className="font-medium">{row.original.invoiceCount}</span>,
      },
      {
        accessorKey: 'ksefSessionRef',
        header: 'Ref. KSeF',
        cell: ({ row }) => (
          <span className="max-w-32 truncate font-mono text-xs">{row.original.ksefSessionRef || '-'}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Akcje',
        cell: ({ row }) => {
          if (row.original.status !== KsefSessionStatus.ACTIVE) return null;
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeSession.mutate(row.original.id)}
              disabled={closeSession.isPending}
            >
              Zamknij
            </Button>
          );
        },
      },
    ],
    [closeSession]
  );

  const sessions = sessionsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesje KSeF"
        description="Zarządzanie sesjami komunikacji z KSeF"
        icon={<Radio className="h-6 w-6" />}
        action={
          <Button
            onClick={() => openSession.mutate(undefined)}
            disabled={openSession.isPending || !!activeSession}
          >
            {openSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Otwórz sesję
          </Button>
        }
      />

      <KsefSessionExpiryBanner />

      <div className="flex gap-4">
        <Select
          value={sessionTypeFilter || 'all'}
          onValueChange={(v) => { setSessionTypeFilter(v === 'all' ? undefined : v); setPage(1); }}
        >
          <SelectTrigger className="w-48"><SelectValue placeholder="Typ sesji" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="INTERACTIVE">Interaktywna</SelectItem>
            <SelectItem value="BATCH">Wsadowa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!activePending && activeSession && (
        <Alert>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <AlertDescription className="flex flex-1 items-center justify-between">
              <span>
                Aktywna sesja — {activeSession.invoiceCount} faktur
                {activeSession.ksefSessionRef && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{activeSession.ksefSessionRef}</span>
                )}
                {activeSession.expiresAt && (
                  <span className="ml-2 text-xs text-muted-foreground">(wygasa: {formatDate(activeSession.expiresAt)})</span>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeSession.mutate(activeSession.id)}
                disabled={closeSession.isPending}
              >
                {closeSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zamknij sesję
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LazyDataTable columns={columns} data={sessions} isLoading={sessionsPending} enablePagination pageSize={20} />
      </Suspense>
    </div>
  );
}
