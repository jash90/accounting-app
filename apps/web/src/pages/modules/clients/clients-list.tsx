import { lazy, Suspense, useCallback, useMemo, useReducer, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Edit,
  Eye,
  History,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';

import {
  BulkActionsToolbar,
  type BulkEditChanges,
} from '@/components/clients/bulk-actions-toolbar';
import { ClientFilters } from '@/components/clients/client-filters';
import { ClientGrid } from '@/components/clients/client-grid';
import { DuplicateWarningDialog } from '@/components/clients/duplicate-warning-dialog';
import { ExportImportDialog } from '@/components/clients/export-import-dialog';
import { IconBadgeList } from '@/components/clients/icon-badge';
import { ColumnVisibilityModal } from '@/components/common/column-visibility-modal';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { ViewModeToggle } from '@/components/common/view-mode-toggle';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { useTablePreferences, type ColumnConfig } from '@/lib/hooks/use-table-preferences';
import type { CreateClientFormData, UpdateClientFormData } from '@/lib/validation/schemas';
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
import { toast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import { type DuplicateCheckResultDto } from '@/lib/api/endpoints/clients';
import { AmlGroupLabels } from '@/lib/constants/polish-labels';
import {
  useBulkDeleteClients,
  useBulkEditClients,
  useBulkRestoreClients,
  useCheckDuplicates,
  useClients,
  useClientStatistics,
  useCreateClient,
  useDeleteClient,
  useDownloadImportTemplate,
  useExportClients,
  useFieldDefinitions,
  useImportClients,
  useRestoreClient,
  useSetClientCustomFields,
  useUpdateClient,
} from '@/lib/hooks/use-clients';
import {
  type ClientFiltersDto,
  type ClientResponseDto,
  type CreateClientDto,
  type UpdateClientDto,
} from '@/types/dtos';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  UserRole,
  VatStatus,
  VatStatusLabels,
  ZusStatusLabels,
  type EmploymentType,
  type TaxScheme,
  type ZusStatus,
} from '@/types/enums';

// -- Reducer for client dialog states --
interface ClientDialogState {
  createOpen: boolean;
  editingClient: ClientResponseDto | null;
  deletingClient: ClientResponseDto | null;
  restoringClient: ClientResponseDto | null;
  exportImportOpen: boolean;
  duplicateWarningOpen: boolean;
  duplicateCheckResult: DuplicateCheckResultDto | null;
  pendingCreateData: {
    data: CreateClientDto;
    customFields?: { values: Record<string, string | null> };
  } | null;
}

type ClientDialogAction =
  | { type: 'OPEN_CREATE' }
  | { type: 'CLOSE_CREATE' }
  | { type: 'SET_EDITING'; payload: ClientResponseDto | null }
  | { type: 'SET_DELETING'; payload: ClientResponseDto | null }
  | { type: 'SET_RESTORING'; payload: ClientResponseDto | null }
  | { type: 'OPEN_EXPORT_IMPORT' }
  | { type: 'CLOSE_EXPORT_IMPORT' }
  | { type: 'SET_EXPORT_IMPORT'; payload: boolean }
  | {
      type: 'OPEN_DUPLICATE_WARNING';
      payload: {
        result: DuplicateCheckResultDto;
        pendingData: ClientDialogState['pendingCreateData'];
      };
    }
  | { type: 'CLOSE_DUPLICATE_WARNING' };

const clientDialogInitialState: ClientDialogState = {
  createOpen: false,
  editingClient: null,
  deletingClient: null,
  restoringClient: null,
  exportImportOpen: false,
  duplicateWarningOpen: false,
  duplicateCheckResult: null,
  pendingCreateData: null,
};

function clientDialogReducer(
  state: ClientDialogState,
  action: ClientDialogAction
): ClientDialogState {
  switch (action.type) {
    case 'OPEN_CREATE':
      return { ...state, createOpen: true };
    case 'CLOSE_CREATE':
      return { ...state, createOpen: false };
    case 'SET_EDITING':
      return { ...state, editingClient: action.payload };
    case 'SET_DELETING':
      return { ...state, deletingClient: action.payload };
    case 'SET_RESTORING':
      return { ...state, restoringClient: action.payload };
    case 'OPEN_EXPORT_IMPORT':
      return { ...state, exportImportOpen: true };
    case 'CLOSE_EXPORT_IMPORT':
      return { ...state, exportImportOpen: false };
    case 'SET_EXPORT_IMPORT':
      return { ...state, exportImportOpen: action.payload };
    case 'OPEN_DUPLICATE_WARNING':
      return {
        ...state,
        duplicateWarningOpen: true,
        duplicateCheckResult: action.payload.result,
        pendingCreateData: action.payload.pendingData,
      };
    case 'CLOSE_DUPLICATE_WARNING':
      return {
        ...state,
        duplicateWarningOpen: false,
        duplicateCheckResult: null,
        pendingCreateData: null,
      };
  }
}

// Lazy-load heavy form dialog (976 lines) - only loaded when add/edit button is clicked
const ClientFormDialog = lazy(() =>
  import('@/components/forms/client-form-dialog').then((m) => ({
    default: m.ClientFormDialog,
  }))
);

// Lazy-load statistics dashboard - only rendered when toggle is clicked
const StatisticsDashboard = lazy(() =>
  import('@/components/clients/statistics-dashboard').then((m) => ({
    default: m.StatisticsDashboard,
  }))
);

// Preload function for form dialog - triggered on mouse enter
const preloadClientFormDialog = () => {
  import('@/components/forms/client-form-dialog');
};

// Dialog loading fallback component
function DialogLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientsListPage() {
  'use no memo';
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Use centralized permission hook instead of hardcoding role checks
  const { hasWritePermission, hasDeletePermission } = useModulePermissions('clients');

  // Determine the base path based on user role - memoized to prevent re-renders
  const basePath = useMemo(() => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/clients';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/clients';
      default:
        return '/modules/clients';
    }
  }, [user?.role]);

  // Fetch custom field definitions
  const { data: fieldDefinitionsResponse } = useFieldDefinitions({ isActive: true });
  const fieldDefinitions = useMemo(
    () => fieldDefinitionsResponse?.data ?? [],
    [fieldDefinitionsResponse?.data]
  );

  // Column configuration for table preferences (including custom fields)
  const columnConfig: ColumnConfig[] = useMemo(() => {
    const basicColumns: ColumnConfig[] = [
      { id: 'name', label: 'Nazwa', alwaysVisible: true },
      { id: 'icons', label: 'Ikony', defaultVisible: true },
      { id: 'nip', label: 'NIP', defaultVisible: true },
      { id: 'email', label: 'Email', defaultVisible: true },
      { id: 'phone', label: 'Telefon', defaultVisible: false },
    ];

    const businessColumns: ColumnConfig[] = [
      { id: 'employmentType', label: 'Zatrudnienie', defaultVisible: true },
      { id: 'vatStatus', label: 'VAT', defaultVisible: true },
      { id: 'taxScheme', label: 'Opodatkowanie', defaultVisible: true },
      { id: 'zusStatus', label: 'ZUS', defaultVisible: false },
      { id: 'amlGroup', label: 'Grupa AML', defaultVisible: false },
      { id: 'pkdCode', label: 'Kod PKD', defaultVisible: false },
      { id: 'gtuCode', label: 'Kod GTU', defaultVisible: false },
    ];

    const dateColumns: ColumnConfig[] = [
      { id: 'cooperationStartDate', label: 'Data współpracy', defaultVisible: false },
      { id: 'companyStartDate', label: 'Data założenia firmy', defaultVisible: false },
      { id: 'createdAt', label: 'Data utworzenia', defaultVisible: false },
    ];

    // Add custom field columns
    const customFieldColumns: ColumnConfig[] = fieldDefinitions.map((field) => ({
      id: `customField_${field.id}`,
      label: field.label,
      defaultVisible: false,
    }));

    return [
      ...basicColumns,
      ...businessColumns,
      ...dateColumns,
      ...customFieldColumns,
      { id: 'actions', label: 'Akcje', alwaysVisible: true },
    ];
  }, [fieldDefinitions]);

  // Column groups for modal
  const columnGroups = useMemo(() => {
    const basicColumns = columnConfig.filter((c) =>
      ['name', 'icons', 'nip', 'email', 'phone'].includes(c.id)
    );
    const businessColumns = columnConfig.filter((c) =>
      [
        'employmentType',
        'vatStatus',
        'taxScheme',
        'zusStatus',
        'amlGroup',
        'pkdCode',
        'gtuCode',
      ].includes(c.id)
    );
    const dateColumns = columnConfig.filter((c) =>
      ['cooperationStartDate', 'companyStartDate', 'createdAt'].includes(c.id)
    );
    const customColumns = columnConfig.filter((c) => c.id.startsWith('customField_'));
    const actionColumns = columnConfig.filter((c) => c.id === 'actions');

    return [
      { key: 'basic', label: 'Podstawowe', columns: basicColumns },
      { key: 'business', label: 'Dane biznesowe', columns: businessColumns },
      { key: 'dates', label: 'Daty', columns: dateColumns },
      ...(customColumns.length > 0
        ? [{ key: 'custom', label: 'Pola niestandardowe', columns: customColumns }]
        : []),
      { key: 'actions', label: 'Inne', columns: actionColumns },
    ];
  }, [columnConfig]);

  const { viewMode, visibleColumns, setViewMode, toggleColumn, resetToDefaults } =
    useTablePreferences('clients-list', columnConfig);

  const [filters, setFilters] = useState<ClientFiltersDto>({});
  const { data: clientsResponse, isPending } = useClients(filters);
  const clients = clientsResponse?.data ?? [];
  const { data: statistics, isLoading: statisticsLoading } = useClientStatistics();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const restoreClient = useRestoreClient();
  const setCustomFields = useSetClientCustomFields();
  const checkDuplicates = useCheckDuplicates();
  const bulkDelete = useBulkDeleteClients();
  const bulkRestore = useBulkRestoreClients();
  const bulkEdit = useBulkEditClients();
  const exportClients = useExportClients();
  const importClients = useImportClients();
  const downloadTemplate = useDownloadImportTemplate();

  const [dialogState, dispatchDialog] = useReducer(clientDialogReducer, clientDialogInitialState);
  const {
    createOpen,
    editingClient,
    deletingClient,
    restoringClient,
    exportImportOpen,
    duplicateWarningOpen,
    duplicateCheckResult,
    pendingCreateData,
  } = dialogState;
  const [selectedClients, setSelectedClients] = useState<ClientResponseDto[]>([]);
  const [showStatistics, setShowStatistics] = useState(false);

  const handleFiltersChange = useCallback((newFilters: ClientFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handleBulkDelete = useCallback(
    (clientIds: string[]) => {
      bulkDelete.mutate(
        { clientIds },
        {
          onSuccess: () => setSelectedClients([]),
        }
      );
    },
    [bulkDelete]
  );

  const handleBulkRestore = useCallback(
    (clientIds: string[]) => {
      bulkRestore.mutate(
        { clientIds },
        {
          onSuccess: () => setSelectedClients([]),
        }
      );
    },
    [bulkRestore]
  );

  const handleBulkEdit = useCallback(
    (clientIds: string[], changes: BulkEditChanges) => {
      bulkEdit.mutate(
        { clientIds, ...changes },
        {
          onSuccess: () => setSelectedClients([]),
        }
      );
    },
    [bulkEdit]
  );

  const handleExport = useCallback(async () => {
    try {
      await exportClients.mutateAsync(filters);
    } catch (error) {
      toast({
        title: 'Błąd eksportu',
        description:
          error instanceof Error ? error.message : 'Nie udało się wyeksportować klientów',
        variant: 'destructive',
      });
    }
  }, [exportClients, filters]);

  const handleImport = useCallback(
    async (file: File) => {
      const result = await importClients.mutateAsync(file);
      return result;
    },
    [importClients]
  );

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await downloadTemplate.mutateAsync();
    } catch (error) {
      toast({
        title: 'Błąd pobierania szablonu',
        description:
          error instanceof Error ? error.message : 'Nie udało się pobrać szablonu importu',
        variant: 'destructive',
      });
    }
  }, [downloadTemplate]);

  const createClientAndClose = useCallback(
    async (data: CreateClientDto, customFields?: { values: Record<string, string | null> }) => {
      const newClient = await createClient.mutateAsync(data);
      // Note: Custom fields must be set after client creation since we need the client ID
      // This is a sequential dependency, not parallel-able
      if (customFields && Object.keys(customFields.values).length > 0) {
        await setCustomFields.mutateAsync({
          id: newClient.id,
          data: customFields,
        });
      }
      dispatchDialog({ type: 'CLOSE_CREATE' });
    },
    [createClient, setCustomFields]
  );

  const handleCreateWithDuplicateCheck = useCallback(
    async (data: CreateClientDto, customFields?: { values: Record<string, string | null> }) => {
      // Check for duplicates first
      if (data.nip || data.email) {
        const result = await checkDuplicates.mutateAsync({
          nip: data.nip,
          email: data.email,
        });

        if (result.hasDuplicates) {
          dispatchDialog({
            type: 'OPEN_DUPLICATE_WARNING',
            payload: { result, pendingData: { data, customFields } },
          });
          return;
        }
      }

      // No duplicates, proceed with creation
      await createClientAndClose(data, customFields);
    },
    [checkDuplicates, createClientAndClose]
  );

  const handleProceedWithDuplicate = useCallback(async () => {
    if (!pendingCreateData) return;

    try {
      await createClientAndClose(pendingCreateData.data, pendingCreateData.customFields);
      dispatchDialog({ type: 'CLOSE_DUPLICATE_WARNING' });
    } catch {
      // Error handled by mutation
    }
  }, [pendingCreateData, createClientAndClose]);

  const handleCancelDuplicate = useCallback(() => {
    dispatchDialog({ type: 'CLOSE_DUPLICATE_WARNING' });
  }, []);

  const handleClientClick = useCallback(
    (clientId: string) => {
      navigate(`${basePath}/${clientId}`);
    },
    [navigate, basePath]
  );

  // Memoized callbacks for DataTable props to prevent unnecessary re-renders
  const handleRowClick = useCallback(
    (client: ClientResponseDto) => navigate(`${basePath}/${client.id}`),
    [navigate, basePath]
  );

  const getRowId = useCallback((row: ClientResponseDto) => row.id, []);

  // Memoized dialog submit handlers to prevent unnecessary re-renders
  const handleCreateSubmit = useCallback(
    async (
      data: CreateClientFormData | UpdateClientFormData,
      customFields?: { values: Record<string, string | null> }
    ) => {
      try {
        const createDto: CreateClientDto = {
          name: data.name!,
          nip: data.nip || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          companyStartDate: data.companyStartDate ?? undefined,
          cooperationStartDate: data.cooperationStartDate ?? undefined,
          companySpecificity: data.companySpecificity || undefined,
          additionalInfo: data.additionalInfo || undefined,
          gtuCode: data.gtuCode || undefined,
          pkdCode: data.pkdCode || undefined,
          amlGroup: data.amlGroup || undefined,
          employmentType: data.employmentType as EmploymentType | undefined,
          vatStatus: data.vatStatus as VatStatus | undefined,
          taxScheme: data.taxScheme as TaxScheme | undefined,
          zusStatus: data.zusStatus as ZusStatus | undefined,
          receiveEmailCopy: data.receiveEmailCopy,
        };
        await handleCreateWithDuplicateCheck(createDto, customFields);
      } catch {
        // Error is handled by mutation's onError callback
        // Dialog stays open so user can retry
      }
    },
    [handleCreateWithDuplicateCheck]
  );

  const handleEditSubmit = useCallback(
    async (
      data: CreateClientFormData | UpdateClientFormData,
      customFields?: { values: Record<string, string | null> }
    ) => {
      if (!editingClient) return;
      try {
        // Execute client update and custom fields update in parallel for faster saves
        const operations: Promise<unknown>[] = [
          updateClient.mutateAsync({
            id: editingClient.id,
            data: data as UpdateClientDto,
          }),
        ];

        if (customFields && Object.keys(customFields.values).length > 0) {
          operations.push(
            setCustomFields.mutateAsync({
              id: editingClient.id,
              data: customFields,
            })
          );
        }

        await Promise.all(operations);
        dispatchDialog({ type: 'SET_EDITING', payload: null });
      } catch {
        // Error is handled by mutation's onError callback
        // Dialog stays open so user can retry
      }
    },
    [editingClient, updateClient, setCustomFields]
  );

  const handleEditDialogOpenChange = useCallback(
    (open: boolean) => !open && dispatchDialog({ type: 'SET_EDITING', payload: null }),
    []
  );

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => !open && dispatchDialog({ type: 'SET_DELETING', payload: null }),
    []
  );

  const handleRestoreDialogOpenChange = useCallback(
    (open: boolean) => !open && dispatchDialog({ type: 'SET_RESTORING', payload: null }),
    []
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingClient) return;
    deleteClient.mutate(deletingClient.id, {
      onSuccess: () => dispatchDialog({ type: 'SET_DELETING', payload: null }),
      onSettled: () => dispatchDialog({ type: 'SET_DELETING', payload: null }),
    });
  }, [deletingClient, deleteClient]);

  const handleRestoreConfirm = useCallback(() => {
    if (!restoringClient) return;
    restoreClient.mutate(restoringClient.id, {
      onSuccess: () => dispatchDialog({ type: 'SET_RESTORING', payload: null }),
      onSettled: () => dispatchDialog({ type: 'SET_RESTORING', payload: null }),
    });
  }, [restoringClient, restoreClient]);

  // Base columns - no fieldDefinitions dependency for better memoization
  const baseColumns = useMemo(
    (): ColumnDef<ClientResponseDto>[] => [
      {
        accessorKey: 'name',
        header: 'Nazwa',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{row.original.name}</span>
            {!row.original.isActive && (
              <Badge variant="outline" className="text-xs">
                Nieaktywny
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'icons',
        header: 'Ikony',
        cell: ({ row }) => {
          const icons =
            row.original.iconAssignments
              ?.map((assignment) => assignment.icon)
              .filter(
                (icon): icon is NonNullable<typeof icon> => icon !== undefined && icon !== null
              ) || [];

          if (icons.length === 0) {
            return <span className="text-muted-foreground">-</span>;
          }

          return <IconBadgeList icons={icons} size="sm" maxVisible={3} />;
        },
      },
      {
        accessorKey: 'nip',
        header: 'NIP',
        cell: ({ row }) => (
          <span className="text-foreground/80 font-mono text-sm">{row.original.nip || '-'}</span>
        ),
      },
      {
        accessorKey: 'employmentType',
        header: 'Zatrudnienie',
        cell: ({ row }) => {
          const type = row.original.employmentType;
          return type ? (
            <Badge variant="secondary" className="text-xs">
              {EmploymentTypeLabels[type]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'vatStatus',
        header: 'VAT',
        cell: ({ row }) => {
          const status = row.original.vatStatus;
          return status ? (
            <Badge variant={status === VatStatus.NO ? 'outline' : 'default'} className="text-xs">
              {VatStatusLabels[status]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'taxScheme',
        header: 'Opodatkowanie',
        cell: ({ row }) => {
          const scheme = row.original.taxScheme;
          return scheme ? (
            <Badge variant="secondary" className="text-xs">
              {TaxSchemeLabels[scheme]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-foreground/70 block max-w-[200px] truncate text-sm">
            {row.original.email || '-'}
          </span>
        ),
      },
      {
        id: 'phone',
        header: 'Telefon',
        cell: ({ row }) => (
          <span className="text-foreground/70 text-sm">{row.original.phone || '-'}</span>
        ),
      },
      {
        accessorKey: 'zusStatus',
        header: 'ZUS',
        cell: ({ row }) => {
          const status = row.original.zusStatus;
          return status ? (
            <Badge variant="secondary" className="text-xs">
              {ZusStatusLabels[status]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'amlGroup',
        header: 'Grupa AML',
        cell: ({ row }) => {
          const group = row.original.amlGroupEnum;
          return group ? (
            <Badge variant="outline" className="text-xs">
              {AmlGroupLabels[group]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'pkdCode',
        header: 'Kod PKD',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.pkdCode || '-'}</span>,
      },
      {
        id: 'gtuCode',
        header: 'Kod GTU',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.gtuCode || '-'}</span>,
      },
      {
        id: 'cooperationStartDate',
        header: 'Data współpracy',
        cell: ({ row }) => {
          const date = row.original.cooperationStartDate;
          return date ? (
            <span className="text-sm">{format(new Date(date), 'dd.MM.yyyy', { locale: pl })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'companyStartDate',
        header: 'Data założenia firmy',
        cell: ({ row }) => {
          const date = row.original.companyStartDate;
          return date ? (
            <span className="text-sm">{format(new Date(date), 'dd.MM.yyyy', { locale: pl })}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Data utworzenia',
        cell: ({ row }) => {
          const date = row.original.createdAt;
          return date ? (
            <span className="text-muted-foreground text-sm">
              {format(new Date(date), 'dd.MM.yyyy', { locale: pl })}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
    ],
    []
  );

  // Custom field columns - separate memoization with fieldDefinitions dependency
  const customFieldColumns = useMemo(
    (): ColumnDef<ClientResponseDto>[] =>
      fieldDefinitions.map((field) => ({
        id: `customField_${field.id}`,
        header: field.label,
        cell: ({ row }: { row: { original: ClientResponseDto } }) => {
          const customFieldValue = row.original.customFieldValues?.find(
            (cfv) => cfv.fieldDefinitionId === field.id
          );
          const value = customFieldValue?.value;

          if (!value) {
            return <span className="text-muted-foreground">-</span>;
          }

          // Format based on field type
          if (field.fieldType === 'BOOLEAN') {
            return <span>{value === 'true' ? 'Tak' : 'Nie'}</span>;
          }

          if (field.fieldType === 'DATE') {
            const dateValue = new Date(value);
            // Check if date is valid (getTime() returns NaN for invalid dates)
            if (!isNaN(dateValue.getTime())) {
              return <span className="text-sm">{dateValue.toLocaleDateString('pl-PL')}</span>;
            }
            // Log invalid date for debugging
            if (import.meta.env.DEV) {
              console.error(`Invalid date value for field "${field.label}":`, value);
            }
            return <span className="text-sm">{value}</span>;
          }

          return <span className="block max-w-[150px] truncate text-sm">{value}</span>;
        },
      })),
    [fieldDefinitions]
  );

  // Actions column - separate memoization with navigation/permission dependencies
  const actionsColumn = useMemo(
    (): ColumnDef<ClientResponseDto> => ({
      id: 'actions',
      header: 'Akcje',
      cell: ({ row }) => {
        const client = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Otwórz menu akcji">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Otwórz menu akcji</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`${basePath}/${client.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Szczegóły
              </DropdownMenuItem>

              {hasWritePermission && client.isActive && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchDialog({ type: 'SET_EDITING', payload: client });
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => navigate(`${basePath}/${client.id}#changelog`)}>
                <History className="mr-2 h-4 w-4" />
                Historia zmian
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {hasDeletePermission && client.isActive && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchDialog({ type: 'SET_DELETING', payload: client });
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              )}

              {hasWritePermission && !client.isActive && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchDialog({ type: 'SET_RESTORING', payload: client });
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Przywróć
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
    [navigate, hasWritePermission, hasDeletePermission, basePath]
  );

  // Combine all columns - only recreates when individual parts change
  const columns = useMemo(
    (): ColumnDef<ClientResponseDto>[] => [...baseColumns, ...customFieldColumns, actionsColumn],
    [baseColumns, customFieldColumns, actionsColumn]
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
        title="Klienci"
        description="Zarządzaj listą klientów biura rachunkowego"
        icon={<Users className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-2">
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <ColumnVisibilityModal
              columns={columnConfig}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              onResetToDefaults={resetToDefaults}
              groups={columnGroups}
            />
            <Button variant="outline" size="sm" onClick={() => setShowStatistics(!showStatistics)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              {showStatistics ? 'Ukryj statystyki' : 'Statystyki'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatchDialog({ type: 'OPEN_EXPORT_IMPORT' })}
            >
              <Download className="mr-2 h-4 w-4" />
              Export / Import
            </Button>
            {hasWritePermission && (
              <Button
                onClick={() => dispatchDialog({ type: 'OPEN_CREATE' })}
                onMouseEnter={preloadClientFormDialog}
                className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                Dodaj klienta
              </Button>
            )}
          </div>
        }
      />

      {showStatistics && (
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <StatisticsDashboard
            statistics={statistics}
            isLoading={statisticsLoading}
            onClientClick={handleClientClick}
          />
        </Suspense>
      )}

      <ClientFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {selectedClients.length > 0 && (
        <BulkActionsToolbar
          selectedClients={selectedClients}
          onClearSelection={() => setSelectedClients([])}
          onBulkDelete={handleBulkDelete}
          onBulkRestore={handleBulkRestore}
          onBulkEdit={handleBulkEdit}
          isDeleting={bulkDelete.isPending}
          isRestoring={bulkRestore.isPending}
          isEditing={bulkEdit.isPending}
          canDelete={hasDeletePermission}
        />
      )}

      <Card className="border-accent/30">
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={clients}
              isLoading={isPending}
              onRowClick={handleRowClick}
              selectable
              selectedRows={selectedClients}
              onSelectionChange={setSelectedClients}
              getRowId={getRowId}
              columnVisibility={visibleColumns}
            />
          ) : (
            <ClientGrid
              clients={clients}
              basePath={basePath}
              isLoading={isPending}
              selectedClients={selectedClients}
              onSelectionChange={setSelectedClients}
              onEditClient={
                hasWritePermission
                  ? (client) => dispatchDialog({ type: 'SET_EDITING', payload: client })
                  : undefined
              }
              onDeleteClient={
                hasDeletePermission
                  ? (client) => dispatchDialog({ type: 'SET_DELETING', payload: client })
                  : undefined
              }
              onRestoreClient={
                hasWritePermission
                  ? (client) => dispatchDialog({ type: 'SET_RESTORING', payload: client })
                  : undefined
              }
              permissions={{ write: hasWritePermission, delete: hasDeletePermission }}
              fieldDefinitions={fieldDefinitions}
              visibleColumns={visibleColumns}
            />
          )}
        </CardContent>
      </Card>

      {hasWritePermission && (
        <>
          {createOpen && (
            <Suspense fallback={<DialogLoadingFallback />}>
              <ClientFormDialog
                open={createOpen}
                onOpenChange={(open) =>
                  dispatchDialog({ type: open ? 'OPEN_CREATE' : 'CLOSE_CREATE' })
                }
                onSubmit={handleCreateSubmit}
              />
            </Suspense>
          )}

          {editingClient && (
            <Suspense fallback={<DialogLoadingFallback />}>
              <ClientFormDialog
                key={editingClient.id}
                open={!!editingClient}
                onOpenChange={handleEditDialogOpenChange}
                client={editingClient}
                onSubmit={handleEditSubmit}
              />
            </Suspense>
          )}
        </>
      )}

      {hasDeletePermission && deletingClient && (
        <ConfirmDialog
          open={!!deletingClient}
          onOpenChange={handleDeleteDialogOpenChange}
          title="Usuń klienta"
          description={`Czy na pewno chcesz usunąć klienta "${deletingClient.name}"? Klient zostanie dezaktywowany i można go będzie przywrócić później.`}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          isLoading={deleteClient.isPending}
        />
      )}

      {restoringClient && (
        <ConfirmDialog
          open={!!restoringClient}
          onOpenChange={handleRestoreDialogOpenChange}
          title="Przywróć klienta"
          description={`Czy na pewno chcesz przywrócić klienta "${restoringClient.name}"?`}
          onConfirm={handleRestoreConfirm}
          isLoading={restoreClient.isPending}
        />
      )}

      <ExportImportDialog
        open={exportImportOpen}
        onOpenChange={(open) => dispatchDialog({ type: 'SET_EXPORT_IMPORT', payload: open })}
        onExport={handleExport}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        isExporting={exportClients.isPending}
        isImporting={importClients.isPending}
      />

      {duplicateCheckResult && (
        <DuplicateWarningDialog
          open={duplicateWarningOpen}
          onOpenChange={(open) => {
            if (!open) dispatchDialog({ type: 'CLOSE_DUPLICATE_WARNING' });
          }}
          byNip={duplicateCheckResult.byNip}
          byEmail={duplicateCheckResult.byEmail}
          onProceed={handleProceedWithDuplicate}
          onCancel={handleCancelDuplicate}
          onViewClient={handleClientClick}
          isPending={createClient.isPending}
        />
      )}
    </div>
  );
}
