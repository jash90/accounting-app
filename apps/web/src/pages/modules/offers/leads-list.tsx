import { useEffect, useMemo, useReducer, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { LeadFormDialog } from '@/components/forms/lead-form-dialog';
import { LeadStatusBadge } from '@/components/offers/lead-status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useConvertLeadToClient,
  useCreateLead,
  useDeleteLead,
  useLeads,
  useUpdateLead,
} from '@/lib/hooks/use-offers';
import { type CreateLeadFormData, type UpdateLeadFormData } from '@/lib/validation/schemas';
import {
  type CreateLeadDto,
  type LeadFiltersDto,
  type LeadResponseDto,
  type UpdateLeadDto,
} from '@/types/dtos';
import { LeadSource, LeadSourceLabels, LeadStatus, LeadStatusLabels } from '@/types/enums';

// -- Reducer for lead dialog states --
interface LeadDialogState {
  isCreateDialogOpen: boolean;
  editingLead: LeadResponseDto | undefined;
  deletingLeadId: string | null;
  convertingLeadId: string | null;
}

type LeadDialogAction =
  | { type: 'OPEN_CREATE' }
  | { type: 'CLOSE_CREATE' }
  | { type: 'SET_EDITING'; payload: LeadResponseDto | undefined }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_CONVERTING'; payload: string | null };

const leadDialogInitialState: LeadDialogState = {
  isCreateDialogOpen: false,
  editingLead: undefined,
  deletingLeadId: null,
  convertingLeadId: null,
};

function leadDialogReducer(state: LeadDialogState, action: LeadDialogAction): LeadDialogState {
  switch (action.type) {
    case 'OPEN_CREATE':
      return { ...state, isCreateDialogOpen: true };
    case 'CLOSE_CREATE':
      return { ...state, isCreateDialogOpen: false };
    case 'SET_EDITING':
      return { ...state, editingLead: action.payload };
    case 'SET_DELETING':
      return { ...state, deletingLeadId: action.payload };
    case 'SET_CONVERTING':
      return { ...state, convertingLeadId: action.payload };
  }
}

export default function LeadsListPage() {
  'use no memo';
  const navigate = useNavigate();
  const basePath = useModuleBasePath('offers');

  const [searchValue, setSearchValue] = useState('');

  const [filters, setFilters] = useState<LeadFiltersDto>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogState, dispatchDialog] = useReducer(leadDialogReducer, leadDialogInitialState);
  const { isCreateDialogOpen, editingLead, deletingLeadId, convertingLeadId } = dialogState;

  // Debounce search input to avoid firing API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const { data, isPending, refetch } = useLeads(filters);
  const leads = data?.data ?? [];

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const convertMutation = useConvertLeadToClient();

  const columns: ColumnDef<LeadResponseDto>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nazwa',
        cell: ({ row }) => (
          <Link
            to={`${basePath}/leads/${row.original.id}`}
            className="text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '-',
      },
      {
        accessorKey: 'phone',
        header: 'Telefon',
        cell: ({ row }) => row.original.phone || '-',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'source',
        header: 'Źródło',
        cell: ({ row }) => (row.original.source ? LeadSourceLabels[row.original.source] : '-'),
      },
      {
        accessorKey: 'estimatedValue',
        header: 'Szacowana wartość',
        cell: ({ row }) =>
          row.original.estimatedValue
            ? `${Number(row.original.estimatedValue).toFixed(2)} PLN`
            : '-',
      },
      {
        accessorKey: 'assignedTo',
        header: 'Przypisany do',
        cell: ({ row }) =>
          row.original.assignedTo
            ? `${row.original.assignedTo.firstName} ${row.original.assignedTo.lastName}`
            : '-',
      },
      {
        accessorKey: 'createdAt',
        header: 'Data utworzenia',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('pl-PL'),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Akcje">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`${basePath}/leads/${row.original.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Szczegóły
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => dispatchDialog({ type: 'SET_EDITING', payload: row.original })}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
              {row.original.status !== LeadStatus.CONVERTED &&
                row.original.status !== LeadStatus.LOST && (
                  <DropdownMenuItem
                    onClick={() =>
                      dispatchDialog({ type: 'SET_CONVERTING', payload: row.original.id })
                    }
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Przekonwertuj na klienta
                  </DropdownMenuItem>
                )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => dispatchDialog({ type: 'SET_DELETING', payload: row.original.id })}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [basePath, navigate]
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const handleCreateLead = async (data: CreateLeadFormData | UpdateLeadFormData) => {
    await createMutation.mutateAsync(data as CreateLeadDto);
    dispatchDialog({ type: 'CLOSE_CREATE' });
  };

  const handleUpdateLead = async (data: CreateLeadFormData | UpdateLeadFormData) => {
    if (!editingLead) return;
    await updateMutation.mutateAsync({
      id: editingLead.id,
      data: data as UpdateLeadDto,
    });
    dispatchDialog({ type: 'SET_EDITING', payload: undefined });
  };

  const handleDeleteLead = async () => {
    if (!deletingLeadId) return;
    await deleteMutation.mutateAsync(deletingLeadId);
    dispatchDialog({ type: 'SET_DELETING', payload: null });
  };

  const handleConvertLead = async () => {
    if (!convertingLeadId) return;
    const result = await convertMutation.mutateAsync({ id: convertingLeadId });
    dispatchDialog({ type: 'SET_CONVERTING', payload: null });
    if (result.clientId) {
      // Optionally navigate to the new client
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(basePath)} aria-label="Wróć">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Prospekty</h1>
            <p className="text-muted-foreground">Zarządzaj potencjalnymi klientami</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Odśwież">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => dispatchDialog({ type: 'OPEN_CREATE' })}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj prospekt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Szukaj..."
          className="w-64"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === 'all' ? undefined : (value as LeadStatus) })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            {Object.values(LeadStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {LeadStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.source || 'all'}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              source: value === 'all' ? undefined : (value as LeadSource),
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Źródło" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie źródła</SelectItem>
            {Object.values(LeadSource).map((source) => (
              <SelectItem key={source} value={source}>
                {LeadSourceLabels[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Brak prospektów do wyświetlenia.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {data && (
        <div className="text-muted-foreground text-sm">
          Wyświetlono {leads.length} z {data.meta.total} prospektów
        </div>
      )}

      {/* Dialogs */}
      <LeadFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => dispatchDialog({ type: open ? 'OPEN_CREATE' : 'CLOSE_CREATE' })}
        onSubmit={handleCreateLead}
      />

      <LeadFormDialog
        open={!!editingLead}
        onOpenChange={(open) =>
          !open && dispatchDialog({ type: 'SET_EDITING', payload: undefined })
        }
        lead={editingLead}
        onSubmit={handleUpdateLead}
      />

      <AlertDialog
        open={!!deletingLeadId}
        onOpenChange={() => dispatchDialog({ type: 'SET_DELETING', payload: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tego prospekta?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Prospekt zostanie trwale usunięty z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-destructive hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!convertingLeadId}
        onOpenChange={() => dispatchDialog({ type: 'SET_CONVERTING', payload: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Przekonwertuj prospekt na klienta</AlertDialogTitle>
            <AlertDialogDescription>
              Prospekt zostanie przekonwertowany na klienta. Dane prospektu zostaną skopiowane do
              nowego rekordu klienta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertLead}
              className="bg-primary hover:bg-primary/90"
            >
              Przekonwertuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
