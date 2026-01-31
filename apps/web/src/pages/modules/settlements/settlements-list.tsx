import { useCallback, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  MessageSquare,
  MoreHorizontal,
  PlayCircle,
  UserPlus,
} from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import {
  SettlementStatus,
  type GetSettlementsQueryDto,
  type SettlementResponseDto,
} from '@/lib/api/endpoints/settlements';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useInitializeMonth,
  useSettlements,
  useUpdateSettlementStatus,
} from '@/lib/hooks/use-settlements';
import { TaxSchemeLabels, UserRole, type TaxScheme } from '@/types/enums';

import { FiltersPanel, type SettlementFilters } from './components/filters-panel';
import { MonthSelector } from './components/month-selector';
import { StatusBadge } from './components/status-badge';
import { StatusDropdown } from './components/status-dropdown';

export default function SettlementsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const basePath = useModuleBasePath('settlements');

  const { hasWritePermission, hasManagePermission } = useModulePermissions('settlements');

  // Check if user is owner or admin
  const isOwnerOrAdmin = user?.role === UserRole.COMPANY_OWNER || user?.role === UserRole.ADMIN;

  // Month/year state
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  // Filters state
  const [filters, setFilters] = useState<SettlementFilters>({});

  // Build query
  const query: GetSettlementsQueryDto = useMemo(
    () => ({
      month,
      year,
      ...filters,
    }),
    [month, year, filters]
  );

  // Data fetching
  const { data: settlementsResponse, isPending } = useSettlements(query);
  const settlements = settlementsResponse?.data ?? [];

  // Mutations
  const updateStatus = useUpdateSettlementStatus();
  const initializeMonth = useInitializeMonth();

  // Handlers
  const handleStatusChange = useCallback(
    (settlementId: string, newStatus: SettlementStatus) => {
      updateStatus.mutate({
        id: settlementId,
        data: { status: newStatus },
      });
    },
    [updateStatus]
  );

  const handleInitializeMonth = useCallback(() => {
    initializeMonth.mutate(
      { month, year },
      {
        onSuccess: (result) => {
          toast({
            title: 'Miesiąc zainicjalizowany',
            description: `Utworzono ${result.created} rozliczeń, pominięto ${result.skipped}`,
          });
        },
      }
    );
  }, [initializeMonth, month, year, toast]);

  const handleFiltersChange = useCallback((newFilters: SettlementFilters) => {
    setFilters(newFilters);
  }, []);

  // Columns definition
  const columns: ColumnDef<SettlementResponseDto>[] = useMemo(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const settlement = row.original;

          if (hasWritePermission) {
            return (
              <StatusDropdown
                currentStatus={settlement.status}
                onStatusChange={(status) => handleStatusChange(settlement.id, status)}
                isLoading={updateStatus.isPending}
              />
            );
          }

          return <StatusBadge status={settlement.status} />;
        },
      },
      {
        accessorKey: 'client.name',
        header: 'Klient',
        cell: ({ row }) => {
          const client = row.original.client;
          return (
            <div className="flex flex-col">
              <span className="text-apptax-navy font-medium">{client?.name || '-'}</span>
              {client?.email && (
                <span className="text-muted-foreground text-xs">{client.email}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'client.nip',
        header: 'NIP',
        cell: ({ row }) => (
          <span className="text-apptax-navy/80 font-mono text-sm">
            {row.original.client?.nip || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'client.taxScheme',
        header: 'Forma opodatkowania',
        cell: ({ row }) => {
          const taxScheme = row.original.client?.taxScheme as TaxScheme | undefined;
          return taxScheme ? (
            <Badge variant="secondary" className="text-xs">
              {TaxSchemeLabels[taxScheme]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'invoiceCount',
        header: 'Faktury',
        cell: ({ row }) => (
          <span className="text-apptax-navy font-medium">{row.original.invoiceCount}</span>
        ),
      },
      {
        accessorKey: 'documentsDate',
        header: 'Data dokumentów',
        cell: ({ row }) => {
          const date = row.original.documentsDate;
          return date ? (
            <span className="text-sm">{format(new Date(date), 'dd.MM.yyyy', { locale: pl })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'assignedUser',
        header: 'Przypisany',
        cell: ({ row }) => {
          const assignedUser = row.original.assignedUser;
          if (!assignedUser) {
            return <span className="text-muted-foreground italic text-sm">Nieprzypisany</span>;
          }
          return (
            <span className="text-sm">
              {assignedUser.firstName && assignedUser.lastName
                ? `${assignedUser.firstName} ${assignedUser.lastName}`
                : assignedUser.email}
            </span>
          );
        },
      },
      {
        accessorKey: 'requiresAttention',
        header: 'Uwagi',
        cell: ({ row }) => {
          if (row.original.requiresAttention) {
            return (
              <div
                className="flex items-center gap-1 text-orange-600"
                title={row.original.attentionReason || 'Wymaga uwagi'}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Wymaga uwagi</span>
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'notes',
        header: 'Notatki',
        cell: ({ row }) => {
          const notes = row.original.notes;
          return notes ? (
            <span
              className="block max-w-[150px] truncate text-sm text-muted-foreground"
              title={notes}
            >
              {notes}
            </span>
          ) : null;
        },
      },
      {
        accessorKey: 'settledBy',
        header: 'Rozliczył',
        cell: ({ row }) => {
          const settledBy = row.original.settledBy;
          if (!settledBy || row.original.status !== SettlementStatus.COMPLETED) {
            return <span className="text-muted-foreground">-</span>;
          }
          return (
            <span className="text-sm">
              {settledBy.firstName && settledBy.lastName
                ? `${settledBy.firstName} ${settledBy.lastName}`
                : settledBy.email}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Akcje',
        cell: ({ row }) => {
          const settlement = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Otwórz menu akcji">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`${basePath}/${settlement.id}/comments`)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Komentarze
                </DropdownMenuItem>

                {hasManagePermission && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate(`${basePath}/${settlement.id}/assign`)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Przypisz pracownika
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      basePath,
      handleStatusChange,
      hasWritePermission,
      hasManagePermission,
      navigate,
      updateStatus.isPending,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Rozliczenia"
        description="Lista rozliczeń klientów za wybrany miesiąc"
        icon={<Calculator className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-4">
            <MonthSelector
              month={month}
              year={year}
              onMonthChange={setMonth}
              onYearChange={setYear}
            />
            {hasManagePermission && (
              <Button
                onClick={handleInitializeMonth}
                disabled={initializeMonth.isPending}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {initializeMonth.isPending ? 'Inicjalizacja...' : 'Zainicjalizuj miesiąc'}
              </Button>
            )}
          </div>
        }
      />

      <FiltersPanel
        filters={filters}
        onChange={handleFiltersChange}
        showEmployeeFilter={isOwnerOrAdmin}
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={columns} data={settlements} isLoading={isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
