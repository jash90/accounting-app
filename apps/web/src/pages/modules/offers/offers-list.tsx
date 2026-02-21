import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

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
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileDown,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';

import { OfferFormDialog } from '@/components/forms/offer-form-dialog';
import { SendOfferDialog } from '@/components/forms/send-offer-dialog';
import { OfferStatusBadge } from '@/components/offers/offer-status-badge';
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
import { PAGINATION } from '@/lib/constants';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useCreateOffer,
  useDeleteOffer,
  useDownloadOfferDocument,
  useDuplicateOffer,
  useGenerateOfferDocument,
  useOffers,
  useSendOffer,
  useUpdateOffer,
} from '@/lib/hooks/use-offers';
import { formDataToCreateDto, formDataToUpdateDto } from '@/lib/utils/offer-converters';
import { type CreateOfferFormData, type UpdateOfferFormData } from '@/lib/validation/schemas';
import { type OfferFiltersDto, type OfferResponseDto, type SendOfferDto } from '@/types/dtos';
import { OfferStatus, OfferStatusLabels } from '@/types/enums';

// -- Reducer for offer dialog states --
interface OfferDialogState {
  isCreateDialogOpen: boolean;
  editingOffer: OfferResponseDto | undefined;
  deletingOfferId: string | null;
  sendingOffer: OfferResponseDto | null;
}

type OfferDialogAction =
  | { type: 'OPEN_CREATE' }
  | { type: 'CLOSE_CREATE' }
  | { type: 'SET_EDITING'; payload: OfferResponseDto | undefined }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_SENDING'; payload: OfferResponseDto | null };

const offerDialogInitialState: OfferDialogState = {
  isCreateDialogOpen: false,
  editingOffer: undefined,
  deletingOfferId: null,
  sendingOffer: null,
};

function offerDialogReducer(state: OfferDialogState, action: OfferDialogAction): OfferDialogState {
  switch (action.type) {
    case 'OPEN_CREATE':
      return { ...state, isCreateDialogOpen: true };
    case 'CLOSE_CREATE':
      return { ...state, isCreateDialogOpen: false };
    case 'SET_EDITING':
      return { ...state, editingOffer: action.payload };
    case 'SET_DELETING':
      return { ...state, deletingOfferId: action.payload };
    case 'SET_SENDING':
      return { ...state, sendingOffer: action.payload };
  }
}

export default function OffersListPage() {
  'use no memo';
  const navigate = useNavigate();
  const basePath = useModuleBasePath('offers');

  const [searchValue, setSearchValue] = useState('');

  const [filters, setFilters] = useState<OfferFiltersDto>({
    page: 1,
    limit: PAGINATION.DEFAULT_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogState, dispatchDialog] = useReducer(offerDialogReducer, offerDialogInitialState);
  const { isCreateDialogOpen, editingOffer, deletingOfferId, sendingOffer } = dialogState;

  // Debounce search input to avoid firing API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const { data, isPending, refetch } = useOffers(filters);
  const offers = data?.data ?? [];

  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const deleteMutation = useDeleteOffer();
  const generateDocMutation = useGenerateOfferDocument();
  const downloadDocMutation = useDownloadOfferDocument();
  const sendMutation = useSendOffer();
  const duplicateMutation = useDuplicateOffer();

  const handleGenerateDocument = useCallback(
    async (offer: OfferResponseDto) => {
      await generateDocMutation.mutateAsync(offer.id);
      refetch();
    },
    [generateDocMutation, refetch]
  );

  const handleDownloadDocument = useCallback(
    async (offer: OfferResponseDto) => {
      if (!offer.generatedDocumentName) return;
      await downloadDocMutation.mutateAsync({
        id: offer.id,
        filename: offer.generatedDocumentName,
      });
    },
    [downloadDocMutation]
  );

  const handleDuplicate = useCallback(
    async (offer: OfferResponseDto) => {
      await duplicateMutation.mutateAsync({ id: offer.id });
    },
    [duplicateMutation]
  );

  // Stable action handlers for column definitions
  // These extract only the .mutate function reference which is stable
  const handleDeleteClick = useCallback((offerId: string) => {
    dispatchDialog({ type: 'SET_DELETING', payload: offerId });
  }, []);

  const handleEditClick = useCallback((offer: OfferResponseDto) => {
    dispatchDialog({ type: 'SET_EDITING', payload: offer });
  }, []);

  const handleSendClick = useCallback((offer: OfferResponseDto) => {
    dispatchDialog({ type: 'SET_SENDING', payload: offer });
  }, []);

  const handleNavigateToDetails = useCallback(
    (offerId: string) => {
      navigate(`${basePath}/${offerId}`);
    },
    [navigate, basePath]
  );

  const columns: ColumnDef<OfferResponseDto>[] = useMemo(
    () => [
      {
        accessorKey: 'offerNumber',
        header: 'Numer',
        cell: ({ row }) => (
          <Link
            to={`${basePath}/${row.original.id}`}
            className="text-primary font-medium hover:underline"
          >
            {row.original.offerNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Tytuł',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate" title={row.original.title}>
            {row.original.title}
          </div>
        ),
      },
      {
        accessorKey: 'recipientSnapshot.name',
        header: 'Odbiorca',
        cell: ({ row }) => row.original.recipientSnapshot?.name || '-',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OfferStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'totalGrossAmount',
        header: 'Wartość brutto',
        cell: ({ row }) => `${Number(row.original.totalGrossAmount).toFixed(2)} PLN`,
      },
      {
        accessorKey: 'offerDate',
        header: 'Data oferty',
        cell: ({ row }) => new Date(row.original.offerDate).toLocaleDateString('pl-PL'),
      },
      {
        accessorKey: 'validUntil',
        header: 'Ważna do',
        cell: ({ row }) => {
          const date = new Date(row.original.validUntil);
          const isExpired = date < new Date() && row.original.status !== OfferStatus.ACCEPTED;
          return (
            <span className={isExpired ? 'text-destructive font-medium' : ''}>
              {date.toLocaleDateString('pl-PL')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const offer = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Akcje">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleNavigateToDetails(offer.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Szczegóły
                </DropdownMenuItem>
                {offer.status === OfferStatus.DRAFT && (
                  <DropdownMenuItem onClick={() => handleEditClick(offer)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {!offer.generatedDocumentPath && (
                  <DropdownMenuItem onClick={() => handleGenerateDocument(offer)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generuj dokument
                  </DropdownMenuItem>
                )}
                {offer.generatedDocumentPath && (
                  <DropdownMenuItem onClick={() => handleDownloadDocument(offer)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Pobierz dokument
                  </DropdownMenuItem>
                )}
                {offer.status === OfferStatus.READY && (
                  <DropdownMenuItem onClick={() => handleSendClick(offer)}>
                    <Send className="mr-2 h-4 w-4" />
                    Wyślij ofertę
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleDuplicate(offer)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplikuj
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {offer.status === OfferStatus.DRAFT && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(offer.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      basePath,
      handleNavigateToDetails,
      handleEditClick,
      handleSendClick,
      handleDeleteClick,
      handleGenerateDocument,
      handleDownloadDocument,
      handleDuplicate,
    ]
  );

  const table = useReactTable({
    data: offers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const handleCreateOffer = async (data: CreateOfferFormData | UpdateOfferFormData) => {
    const dto = formDataToCreateDto(data as CreateOfferFormData);
    await createMutation.mutateAsync(dto);
    dispatchDialog({ type: 'CLOSE_CREATE' });
  };

  const handleUpdateOffer = async (data: CreateOfferFormData | UpdateOfferFormData) => {
    if (!editingOffer) return;
    const dto = formDataToUpdateDto(data as UpdateOfferFormData);
    await updateMutation.mutateAsync({
      id: editingOffer.id,
      data: dto,
    });
    dispatchDialog({ type: 'SET_EDITING', payload: undefined });
  };

  const handleDeleteOffer = async () => {
    if (!deletingOfferId) return;
    await deleteMutation.mutateAsync(deletingOfferId);
    dispatchDialog({ type: 'SET_DELETING', payload: null });
  };

  const handleSendOffer = async (data: SendOfferDto) => {
    if (!sendingOffer) return;
    await sendMutation.mutateAsync({ id: sendingOffer.id, data });
    dispatchDialog({ type: 'SET_SENDING', payload: null });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(basePath)} aria-label="Wróć">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Lista ofert</h1>
            <p className="text-muted-foreground">Zarządzaj ofertami handlowymi</p>
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
            Nowa oferta
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
            setFilters({
              ...filters,
              status: value === 'all' ? undefined : (value as OfferStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            {Object.values(OfferStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {OfferStatusLabels[status]}
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
                  Brak ofert do wyświetlenia.
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

      {/* Pagination */}
      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-muted-foreground text-sm">
            Wyświetlanie{' '}
            <span className="text-foreground font-medium">
              {((filters.page ?? 1) - 1) * (filters.limit ?? PAGINATION.DEFAULT_PAGE_SIZE) + 1}
            </span>{' '}
            -{' '}
            <span className="text-foreground font-medium">
              {Math.min(
                (filters.page ?? 1) * (filters.limit ?? PAGINATION.DEFAULT_PAGE_SIZE),
                data.meta.total
              )}
            </span>{' '}
            z <span className="text-foreground font-medium">{data.meta.total}</span> ofert
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
              disabled={(filters.page ?? 1) <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
              disabled={(filters.page ?? 1) >= (data.meta.totalPages ?? 1)}
            >
              Następna
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <OfferFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => dispatchDialog({ type: open ? 'OPEN_CREATE' : 'CLOSE_CREATE' })}
        onSubmit={handleCreateOffer}
      />

      <OfferFormDialog
        open={!!editingOffer}
        onOpenChange={(open) =>
          !open && dispatchDialog({ type: 'SET_EDITING', payload: undefined })
        }
        offer={editingOffer}
        onSubmit={handleUpdateOffer}
      />

      {sendingOffer && (
        <SendOfferDialog
          open={!!sendingOffer}
          onOpenChange={(open) => !open && dispatchDialog({ type: 'SET_SENDING', payload: null })}
          offer={sendingOffer}
          onSubmit={handleSendOffer}
          isLoading={sendMutation.isPending}
        />
      )}

      <AlertDialog
        open={!!deletingOfferId}
        onOpenChange={() => dispatchDialog({ type: 'SET_DELETING', payload: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę ofertę?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Oferta zostanie trwale usunięta z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              className="bg-destructive hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
