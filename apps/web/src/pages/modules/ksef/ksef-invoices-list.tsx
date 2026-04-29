import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle, Cloud, Code, Eye, FileText, HardDrive, Loader2, MoreHorizontal, Plus, Send, ShieldAlert, Trash2,
} from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { createStatusBadge } from '@/components/common/status-badge';
import { PageHeader } from '@/components/common/page-header';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { KsefInvoiceFilters, KsefInvoiceResponse } from '@/lib/api/endpoints/ksef';
import { useClients } from '@/lib/hooks/use-clients';
import { KsefSessionExpiryBanner } from './components/ksef-session-expiry-banner';
import {
  useKsefInvoices, useCreateKsefInvoice, useDeleteKsefInvoice,
  useGenerateKsefXml, useSubmitKsefInvoice, useBatchSubmitKsefInvoices,
  useBatchDeleteKsefInvoices,
  useKsefConfig, useKsefHealth,
} from '@/lib/hooks/use-ksef';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { formatDate } from '@/lib/utils/format-date';
import {
  KsefInvoiceStatus, KsefInvoiceStatusLabels, KsefInvoiceStatusColors,
  KsefInvoiceType, KsefInvoiceTypeLabels,
  KsefInvoiceDirection, KsefInvoiceDirectionLabels,
} from '@/types/enums';

const LazyDataTable = lazy(() =>
  import('@/components/common/data-table').then((m) => ({ default: m.DataTable }))
);

const InvoiceStatusBadge = createStatusBadge<KsefInvoiceStatus>({
  colors: KsefInvoiceStatusColors,
  labels: KsefInvoiceStatusLabels,
});

const formatPLN = (amount: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);

function KsefSourceBadge({ invoice }: { invoice: KsefInvoiceResponse }) {
  const hasKsefNumber = !!invoice.ksefNumber;
  const hasKsefRef = !!invoice.ksefReferenceNumber;
  const isDraft = invoice.status === KsefInvoiceStatus.DRAFT;

  if (hasKsefNumber) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              <Cloud className="h-3 w-3" />KSeF
            </span>
          </TooltipTrigger>
          <TooltipContent><p>{invoice.ksefNumber}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (hasKsefRef) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Cloud className="h-3 w-3" />Wysłana
            </span>
          </TooltipTrigger>
          <TooltipContent><p>Ref: {invoice.ksefReferenceNumber}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (isDraft) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <HardDrive className="h-3 w-3" />Lokalna
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">
      <AlertTriangle className="h-3 w-3" />Błąd
    </span>
  );
}

// ── Constants ──────────────────────────────
const VAT_RATE_OPTIONS = [
  { value: '23', label: '23%' },
  { value: '8', label: '8%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
  { value: '-1', label: 'zw.' },
  { value: '-2', label: 'np.' },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'przelew', label: 'Przelew' },
  { value: 'gotówka', label: 'Gotówka' },
  { value: 'karta', label: 'Karta' },
  { value: 'kompensata', label: 'Kompensata' },
] as const;

function vatRateToNumber(rate: string): number {
  // Backend uses -1 for exempt (zw) and -2 for not-subject (np)
  const parsed = parseFloat(rate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Map vatRate number for VAT calculation — exempt and not-subject rates produce 0% VAT */
function vatRateForCalc(rate: number): number {
  return rate < 0 ? 0 : rate;
}

// ── Zod schema for create invoice ──────────────────────────────
const lineItemSchema = z.object({
  description: z.string().min(1, 'Wymagany opis'),
  quantity: z.coerce.number().min(0.001),
  unitNetPrice: z.coerce.number().min(0),
  vatRate: z.string().min(1, 'Wymagana stawka VAT'),
});

const createInvoiceSchema = z.object({
  invoiceType: z.nativeEnum(KsefInvoiceType),
  issueDate: z.string().min(1, 'Wymagana data wystawienia'),
  salesDate: z.string().optional(),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
  buyerName: z.string().min(1, 'Wymagana nazwa nabywcy'),
  buyerNip: z.string().optional(),
  buyerStreet: z.string().optional(),
  buyerPostalCode: z.string().optional(),
  buyerCity: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Wymagana co najmniej jedna pozycja'),
  paymentMethod: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
});

type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export default function KsefInvoicesListPage() {
  const basePath = useModuleBasePath('ksef');
  const navigate = useNavigate();
  const [filters, setFilters] = useState<KsefInvoiceFilters>({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchValue, setSearchValue] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<KsefInvoiceResponse[]>([]);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  const { data, isPending } = useKsefInvoices(filters);
  const { data: ksefConfig } = useKsefConfig();
  const { data: ksefHealth } = useKsefHealth();
  const createInvoice = useCreateKsefInvoice();
  const deleteInvoice = useDeleteKsefInvoice();
  const generateXml = useGenerateKsefXml();
  const submitInvoice = useSubmitKsefInvoice();
  const batchSubmit = useBatchSubmitKsefInvoices();
  const batchDelete = useBatchDeleteKsefInvoices();

  // Statuses for which a hard-delete is allowed. Mirrors the backend
  // `KsefInvoiceService.DELETABLE_STATUSES` — keep in sync if either side
  // changes. SUBMITTED and ACCEPTED are deliberately excluded: they have a
  // permanent KSeF entry and removing the local row would create a silent
  // reconciliation gap.
  const isDeletable = (status: string) =>
    status === KsefInvoiceStatus.DRAFT ||
    status === KsefInvoiceStatus.PENDING_SUBMISSION ||
    status === KsefInvoiceStatus.REJECTED ||
    status === KsefInvoiceStatus.ERROR;
  const deletableSelectedRows = selectedRows.filter((r) => isDeletable(r.status));
  const isDraftStatus = (status: string) => status === KsefInvoiceStatus.DRAFT;
  const draftSelectedRows = selectedRows.filter((r) => isDraftStatus(r.status));

  const configResolved = ksefConfig && typeof ksefConfig === 'object' && 'id' in ksefConfig ? ksefConfig : null;
  const hasConfig = !!configResolved;
  const hasToken = !!configResolved?.hasToken;
  const hasCert = !!configResolved?.hasCertificate && !!configResolved?.hasPrivateKey;
  const hasCredentials = hasToken || hasCert;
  const isHealthy = ksefHealth && typeof ksefHealth === 'object' && 'healthy' in ksefHealth ? (ksefHealth as { healthy: boolean }).healthy : undefined;

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteInvoice.mutate(deletingId, { onSuccess: () => setDeletingId(null) });
  }, [deletingId, deleteInvoice]);

  const hasActiveFilters = !!(filters.status || filters.invoiceType || filters.direction || filters.search);

  const columns = useMemo<ColumnDef<KsefInvoiceResponse>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Numer',
        cell: ({ row }) => (
          <Link to={`${basePath}/invoices/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.invoiceNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status as KsefInvoiceStatus} />,
      },
      {
        id: 'source',
        header: 'Źródło',
        cell: ({ row }) => <KsefSourceBadge invoice={row.original} />,
      },
      {
        accessorKey: 'invoiceType',
        header: 'Typ',
        cell: ({ row }) => (
          <span className="text-sm">
            {KsefInvoiceTypeLabels[row.original.invoiceType as KsefInvoiceType] ?? row.original.invoiceType}
          </span>
        ),
      },
      {
        accessorKey: 'direction',
        header: 'Kierunek',
        cell: ({ row }) => (
          <span className="text-sm">
            {KsefInvoiceDirectionLabels[row.original.direction as KsefInvoiceDirection] ?? row.original.direction}
          </span>
        ),
      },
      {
        accessorKey: 'buyerName',
        header: 'Nabywca',
        cell: ({ row }) => <span className="max-w-40 truncate text-sm">{row.original.buyerName}</span>,
      },
      {
        accessorKey: 'issueDate',
        header: 'Data wystawienia',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.issueDate)}</span>,
      },
      {
        accessorKey: 'grossAmount',
        header: 'Brutto',
        cell: ({ row }) => <span className="font-medium">{formatPLN(row.original.grossAmount)}</span>,
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const inv = row.original;
          const isDraft = inv.status === KsefInvoiceStatus.DRAFT;
          // Single-row delete is offered for any status the backend
          // `DELETABLE_STATUSES` set accepts (DRAFT/PENDING_SUBMISSION/
          // REJECTED/ERROR). The previous behavior only let users delete
          // drafts, leaving rejected invoices stuck on the list with no
          // recovery action.
          const canDelete =
            inv.status === KsefInvoiceStatus.DRAFT ||
            inv.status === KsefInvoiceStatus.PENDING_SUBMISSION ||
            inv.status === KsefInvoiceStatus.REJECTED ||
            inv.status === KsefInvoiceStatus.ERROR;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`${basePath}/invoices/${inv.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />Szczegóły
                </DropdownMenuItem>
                {isDraft && (
                  <>
                    <DropdownMenuItem onClick={() => generateXml.mutate(inv.id)}>
                      <Code className="mr-2 h-4 w-4" />Generuj XML
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => hasCredentials ? submitInvoice.mutate(inv.id) : undefined}
                      disabled={!hasCredentials}
                    >
                      <Send className="mr-2 h-4 w-4" />Wyślij do KSeF
                      {!hasCredentials && <span className="ml-1 text-xs text-muted-foreground">(brak uprawnień)</span>}
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(inv.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Usuń
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [basePath, navigate, generateXml, submitInvoice, hasCredentials]
  );

  const invoices = data?.data ?? [];

  // ── Create Invoice Form ──────────────────────
  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      invoiceType: KsefInvoiceType.SALES,
      issueDate: new Date().toISOString().split('T')[0],
      clientId: '',
      lineItems: [{ description: '', quantity: 1, unitNetPrice: 0, vatRate: '23' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lineItems' });
  const watchedLineItems = form.watch('lineItems');

  // Client auto-fill
  const { data: clientsData } = useClients({ page: 1, limit: 100 });
  const clients = clientsData?.data ?? [];
  const selectedClientId = form.watch('clientId');

  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (client) {
      form.setValue('buyerName', client.name);
      form.setValue('buyerNip', client.nip ?? '');
      form.setValue('buyerStreet', (client as any).street ?? '');
      form.setValue('buyerPostalCode', (client as any).postalCode ?? '');
      form.setValue('buyerCity', (client as any).city ?? '');
    }
  }, [selectedClientId, clients, form]);

  const handleCreate = (values: CreateInvoiceFormValues) => {
    createInvoice.mutate(
      {
        invoiceType: values.invoiceType,
        issueDate: values.issueDate,
        salesDate: values.salesDate || undefined,
        dueDate: values.dueDate || undefined,
        clientId: values.clientId || undefined,
        buyerData: {
          name: values.buyerName,
          nip: values.buyerNip || undefined,
          street: values.buyerStreet || undefined,
          postalCode: values.buyerPostalCode || undefined,
          city: values.buyerCity || undefined,
        },
        lineItems: values.lineItems.map((li) => {
          const qty = Number(li.quantity) || 0;
          const price = Number(li.unitNetPrice) || 0;
          const rate = vatRateToNumber(li.vatRate);
          const net = Math.round(qty * price * 100) / 100;
          const vat = Math.round(net * (vatRateForCalc(rate) / 100) * 100) / 100;
          return {
            description: li.description,
            quantity: qty,
            unitNetPrice: price,
            netAmount: net,
            vatRate: rate,
            vatAmount: vat,
            grossAmount: Math.round((net + vat) * 100) / 100,
          };
        }),
        paymentMethod: values.paymentMethod || undefined,
        bankAccount: values.bankAccount || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          form.reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faktury KSeF"
        description="Lista faktur w Krajowym Systemie e-Faktur"
        icon={<FileText className="h-6 w-6" />}
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nowa faktura
          </Button>
        }
      />

      <KsefSessionExpiryBanner />

      {!hasConfig && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Brak konfiguracji KSeF. <Link to={`${basePath}/settings`} className="underline font-medium">Przejdź do ustawień</Link>, aby skonfigurować połączenie z KSeF.
            Faktury można tworzyć lokalnie, ale wysyłka do KSeF nie będzie możliwa.
          </AlertDescription>
        </Alert>
      )}

      {hasConfig && !hasCredentials && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Brak danych uwierzytelniających. <Link to={`${basePath}/settings`} className="underline font-medium">Wgraj token lub certyfikat</Link>, aby móc wysyłać faktury do KSeF.
          </AlertDescription>
        </Alert>
      )}

      {hasConfig && hasCredentials && isHealthy === false && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Serwer KSeF jest niedostępny. Faktury lokalne mogą być tworzone, ale wysyłka jest tymczasowo niemożliwa.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Szukaj..."
          className="max-w-xs"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v === 'all' ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            {Object.values(KsefInvoiceStatus).map((s) => (
              <SelectItem key={s} value={s}>{KsefInvoiceStatusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.invoiceType || 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, invoiceType: v === 'all' ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40"><SelectValue placeholder="Typ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {Object.values(KsefInvoiceType).map((t) => (
              <SelectItem key={t} value={t}>{KsefInvoiceTypeLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.direction || 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, direction: v === 'all' ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-44"><SelectValue placeholder="Kierunek" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kierunki</SelectItem>
            {Object.values(KsefInvoiceDirection).map((d) => (
              <SelectItem key={d} value={d}>{KsefInvoiceDirectionLabels[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count & Clear Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.meta?.total ?? 0} faktur</p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }); setSearchValue(''); }}>
            Wyczyść filtry
          </Button>
        )}
      </div>

      {/* Table */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <LazyDataTable
          columns={columns}
          data={invoices}
          isLoading={isPending}
          enablePagination
          pageSize={20}
          selectable
          // Pass the controlled `selectedRows` BACK so the DataTable can
          // reflect the visual checkbox state. Without this prop the
          // table's internal `rowSelection` derivation (when `getRowId`
          // is set) reads from an empty default and the checkboxes
          // never look selected — even though the parent's bulk-action
          // bar shows the correct count.
          selectedRows={selectedRows as unknown as never[]}
          onSelectionChange={setSelectedRows as (rows: unknown[]) => void}
          getRowId={(row: unknown) => (row as KsefInvoiceResponse).id}
          // Server-side pagination: backend returns 20-row pages plus a
          // canonical total. Without these props the table would show
          // "z 20 wyników" and disable Next even when more pages exist.
          totalCount={data?.meta?.total}
          pageIndex={(filters.page ?? 1) - 1}
          onPageChange={(zeroBasedIdx) => setFilters((prev) => ({ ...prev, page: zeroBasedIdx + 1 }))}
        />
      </Suspense>

      {/* Batch Action Bar */}
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">Zaznaczono: {selectedRows.length}</span>
          {/* Send is only meaningful for DRAFT — the backend `submitInvoice`
              rejects anything else. We disable the button when the
              selection contains zero drafts so the user gets a clear cue. */}
          <Button
            size="sm"
            onClick={() => setIsBatchConfirmOpen(true)}
            disabled={!hasCredentials || draftSelectedRows.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Wyślij zaznaczone {draftSelectedRows.length > 0 && `(${draftSelectedRows.length})`}
            {!hasCredentials && <span className="ml-1 text-xs">(brak uprawnień)</span>}
          </Button>
          {/* Delete is offered for any deletable status — DRAFT,
              PENDING_SUBMISSION, REJECTED, ERROR. SUBMITTED/ACCEPTED are
              filtered out client-side; the backend would reject them anyway. */}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsBatchDeleteOpen(true)}
            disabled={deletableSelectedRows.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń zaznaczone {deletableSelectedRows.length > 0 && `(${deletableSelectedRows.length})`}
          </Button>
        </div>
      )}

      {/* Batch Submit Confirmation */}
      <AlertDialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyślij faktury do KSeF</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.length === draftSelectedRows.length
                ? `Czy na pewno chcesz wysłać ${draftSelectedRows.length} faktur do KSeF?`
                : `Wśród zaznaczonych faktur tylko ${draftSelectedRows.length} jest w statusie szkic — zostaną wysłane. Pozostałe (${selectedRows.length - draftSelectedRows.length}) zostaną pominięte.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                batchSubmit.mutate(draftSelectedRows.map((r) => r.id), {
                  onSuccess: () => { setIsBatchConfirmOpen(false); setSelectedRows([]); },
                });
              }}
            >
              {batchSubmit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wyślij ({draftSelectedRows.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń faktury</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.length === deletableSelectedRows.length
                ? `Czy na pewno chcesz usunąć ${deletableSelectedRows.length} ${deletableSelectedRows.length === 1 ? 'fakturę' : 'faktur'}? Operacja jest nieodwracalna.`
                : `Tylko ${deletableSelectedRows.length} z ${selectedRows.length} zaznaczonych można usunąć (szkice / odrzucone / błędne). Pozostałe pominę. Operacja jest nieodwracalna.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                batchDelete.mutate(deletableSelectedRows.map((r) => r.id), {
                  onSuccess: () => { setIsBatchDeleteOpen(false); setSelectedRows([]); },
                });
              }}
            >
              {batchDelete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń ({deletableSelectedRows.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń fakturę</AlertDialogTitle>
            <AlertDialogDescription>Czy na pewno chcesz usunąć tę fakturę? Operacja jest nieodwracalna.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Nowa faktura KSeF</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="invoiceType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ faktury</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.values(KsefInvoiceType).map((t) => (
                            <SelectItem key={t} value={t}>{KsefInvoiceTypeLabels[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="issueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data wystawienia</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="salesDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data sprzedaży</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termin płatności</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Client auto-fill */}
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Klient (opcjonalnie)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === '__new__' ? '' : v)} value={field.value || '__new__'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Wybierz klienta lub wpisz ręcznie" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__new__">Nowy nabywca</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}{c.nip ? ` (${c.nip})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="buyerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa nabywcy *</FormLabel>
                      <FormControl><Input placeholder="Firma Sp. z o.o." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="buyerNip" render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIP nabywcy</FormLabel>
                      <FormControl><Input placeholder="1234567890" maxLength={10} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField control={form.control} name="buyerStreet" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ulica nabywcy</FormLabel>
                      <FormControl><Input placeholder="ul. Przykładowa 1" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="buyerPostalCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kod pocztowy</FormLabel>
                      <FormControl><Input placeholder="00-000" maxLength={6} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="buyerCity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miasto</FormLabel>
                      <FormControl><Input placeholder="Warszawa" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Pozycje faktury</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unitNetPrice: 0, vatRate: '23' })}>
                      <Plus className="mr-1 h-3 w-3" />Dodaj
                    </Button>
                  </div>
                  {fields.map((field, index) => {
                    const qty = Number(watchedLineItems[index]?.quantity) || 0;
                    const price = Number(watchedLineItems[index]?.unitNetPrice) || 0;
                    const rate = vatRateToNumber(String(watchedLineItems[index]?.vatRate ?? '0'));
                    const net = Math.round(qty * price * 100) / 100;
                    const vat = Math.round(net * (vatRateForCalc(rate) / 100) * 100) / 100;
                    const gross = Math.round((net + vat) * 100) / 100;

                    return (
                      <div key={field.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Pozycja {index + 1}</span>
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field: f }) => (
                          <FormItem>
                            <FormControl><Input placeholder="Opis usługi/produktu" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-3 gap-2">
                          <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Ilość</FormLabel>
                              <FormControl><Input type="number" step="0.001" {...f} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.unitNetPrice`} render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Cena netto</FormLabel>
                              <FormControl><Input type="number" step="0.01" {...f} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name={`lineItems.${index}.vatRate`} render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">VAT</FormLabel>
                              <Select onValueChange={f.onChange} value={String(f.value)}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {VAT_RATE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded bg-muted/50 p-2 text-sm">
                          <div><span className="text-xs text-muted-foreground">Netto:</span> <span className="font-medium">{formatPLN(net)}</span></div>
                          <div><span className="text-xs text-muted-foreground">VAT:</span> <span className="font-medium">{formatPLN(vat)}</span></div>
                          <div><span className="text-xs text-muted-foreground">Brutto:</span> <span className="font-medium">{formatPLN(gross)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metoda płatności</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bankAccount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numer rachunku</FormLabel>
                      <FormControl><Input placeholder="PL..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uwagi</FormLabel>
                    <FormControl><Textarea placeholder="Dodatkowe uwagi do faktury" rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Anuluj</Button>
                  <Button type="submit" disabled={createInvoice.isPending}>
                    {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Utwórz fakturę
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
