import { useState, useMemo, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  RotateCcw,
  MoreHorizontal,
  History,
  ArrowLeft,
  Download,
  BarChart3,
} from 'lucide-react';

import {
  BulkActionsToolbar,
  type BulkEditChanges,
} from '@/components/clients/bulk-actions-toolbar';
import { ClientFilters } from '@/components/clients/client-filters';
import { IconBadgeList } from '@/components/clients/icon-badge';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import {
  useClients,
  useDeleteClient,
  useRestoreClient,
  useSetClientCustomFields,
  useCreateClient,
  useUpdateClient,
  useClientStatistics,
  useCheckDuplicates,
  useBulkDeleteClients,
  useBulkRestoreClients,
  useBulkEditClients,
  useExportClients,
  useImportClients,
  useDownloadImportTemplate,
  useFieldDefinitions,
} from '@/lib/hooks/use-clients';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTablePreferences, type ColumnConfig } from '@/lib/hooks/use-table-preferences';
import {
  type ClientResponseDto,
  type CreateClientDto,
  type UpdateClientDto,
  type ClientFiltersDto,
} from '@/types/dtos';
import { ClientFormDialog } from '@/components/forms/client-form-dialog';
import { ExportImportDialog } from '@/components/clients/export-import-dialog';
import { DuplicateWarningDialog } from '@/components/clients/duplicate-warning-dialog';
import { StatisticsDashboard } from '@/components/clients/statistics-dashboard';
import { ClientGrid } from '@/components/clients/client-grid';
import { ViewModeToggle } from '@/components/common/view-mode-toggle';
import { ColumnVisibilityModal } from '@/components/common/column-visibility-modal';
import { type DuplicateCheckResultDto } from '@/lib/api/endpoints/clients';
import { useAuthContext } from '@/contexts/auth-context';
import {
  EmploymentTypeLabels,
  VatStatus,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  UserRole,
} from '@/types/enums';
import { AmlGroupLabels } from '@/lib/constants/polish-labels';
import { toast } from '@/components/ui/use-toast';

export default function ClientsListPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Use centralized permission hook instead of hardcoding role checks
  const { hasWritePermission, hasDeletePermission } = useModulePermissions('clients');

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/clients';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/clients';
      default:
        return '/modules/clients';
    }
  };

  const basePath = getBasePath();

  // Fetch custom field definitions
  const { data: fieldDefinitionsResponse } = useFieldDefinitions({ isActive: true });
  const fieldDefinitions = fieldDefinitionsResponse?.data ?? [];

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

  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientResponseDto | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientResponseDto | null>(null);
  const [restoringClient, setRestoringClient] = useState<ClientResponseDto | null>(null);
  const [selectedClients, setSelectedClients] = useState<ClientResponseDto[]>([]);
  const [showStatistics, setShowStatistics] = useState(false);
  const [exportImportOpen, setExportImportOpen] = useState(false);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResultDto | null>(
    null
  );
  const [pendingCreateData, setPendingCreateData] = useState<{
    data: CreateClientDto;
    customFields?: { values: Record<string, unknown> };
  } | null>(null);

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
    async (data: CreateClientDto, customFields?: { values: Record<string, unknown> }) => {
      const newClient = await createClient.mutateAsync(data);
      if (customFields && Object.keys(customFields.values).length > 0) {
        await setCustomFields.mutateAsync({
          id: newClient.id,
          data: customFields,
        });
      }
      setCreateOpen(false);
    },
    [createClient, setCustomFields]
  );

  const handleCreateWithDuplicateCheck = useCallback(
    async (data: CreateClientDto, customFields?: { values: Record<string, unknown> }) => {
      // Check for duplicates first
      if (data.nip || data.email) {
        const result = await checkDuplicates.mutateAsync({
          nip: data.nip,
          email: data.email,
        });

        if (result.hasDuplicates) {
          setDuplicateCheckResult(result);
          setPendingCreateData({ data, customFields });
          setDuplicateWarningOpen(true);
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
      setDuplicateWarningOpen(false);
      setDuplicateCheckResult(null);
      setPendingCreateData(null);
    } catch {
      // Error handled by mutation
    }
  }, [pendingCreateData, createClientAndClose]);

  const handleCancelDuplicate = useCallback(() => {
    setDuplicateWarningOpen(false);
    setDuplicateCheckResult(null);
    setPendingCreateData(null);
  }, []);

  const handleClientClick = useCallback(
    (clientId: string) => {
      navigate(`${basePath}/${clientId}`);
    },
    [navigate, basePath]
  );

  const columns: ColumnDef<ClientResponseDto>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nazwa',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-apptax-navy">{row.original.name}</span>
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
          <span className="text-apptax-navy/80 font-mono text-sm">{row.original.nip || '-'}</span>
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
          <span className="text-apptax-navy/70 text-sm truncate max-w-[200px] block">
            {row.original.email || '-'}
          </span>
        ),
      },
      {
        id: 'phone',
        header: 'Telefon',
        cell: ({ row }) => (
          <span className="text-apptax-navy/70 text-sm">{row.original.phone || '-'}</span>
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
        cell: ({ row }) => <span className="text-sm font-mono">{row.original.pkdCode || '-'}</span>,
      },
      {
        id: 'gtuCode',
        header: 'Kod GTU',
        cell: ({ row }) => <span className="text-sm font-mono">{row.original.gtuCode || '-'}</span>,
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
            <span className="text-sm text-muted-foreground">
              {format(new Date(date), 'dd.MM.yyyy', { locale: pl })}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      // Custom field columns
      ...fieldDefinitions.map((field) => ({
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
            console.error(`Invalid date value for field "${field.label}":`, value);
            return <span className="text-sm">{value}</span>;
          }

          return <span className="text-sm truncate max-w-[150px] block">{value}</span>;
        },
      })),
      {
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
                      setEditingClient(client);
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
                      setDeletingClient(client);
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
                      setRestoringClient(client);
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
      },
    ],
    [navigate, hasWritePermission, hasDeletePermission, basePath, fieldDefinitions]
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
            <Button variant="outline" size="sm" onClick={() => setExportImportOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Export / Import
            </Button>
            {hasWritePermission && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                Dodaj klienta
              </Button>
            )}
          </div>
        }
      />

      {showStatistics && (
        <StatisticsDashboard
          statistics={statistics}
          isLoading={statisticsLoading}
          onClientClick={handleClientClick}
        />
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

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={clients}
              isLoading={isPending}
              onRowClick={(client) => navigate(`${basePath}/${client.id}`)}
              selectable
              selectedRows={selectedClients}
              onSelectionChange={setSelectedClients}
              getRowId={(row) => row.id}
              columnVisibility={visibleColumns}
            />
          ) : (
            <ClientGrid
              clients={clients}
              basePath={basePath}
              isLoading={isPending}
              selectedClients={selectedClients}
              onSelectionChange={setSelectedClients}
              onEditClient={hasWritePermission ? setEditingClient : undefined}
              onDeleteClient={hasDeletePermission ? setDeletingClient : undefined}
              onRestoreClient={hasWritePermission ? setRestoringClient : undefined}
              hasWritePermission={hasWritePermission}
              hasDeletePermission={hasDeletePermission}
              fieldDefinitions={fieldDefinitions}
              visibleColumns={visibleColumns}
            />
          )}
        </CardContent>
      </Card>

      {hasWritePermission && (
        <>
          <ClientFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={async (data, customFields) => {
              try {
                // Transform form data to CreateClientDto with proper validation
                const createDto: CreateClientDto = {
                  name: data.name,
                  nip: data.nip || undefined,
                  email: data.email || undefined,
                  phone: data.phone || undefined,
                  companyStartDate: data.companyStartDate,
                  cooperationStartDate: data.cooperationStartDate,
                  suspensionDate: data.suspensionDate,
                  companySpecificity: data.companySpecificity || undefined,
                  additionalInfo: data.additionalInfo || undefined,
                  gtuCode: data.gtuCode || undefined,
                  pkdCode: data.pkdCode || undefined,
                  amlGroup: data.amlGroup || undefined,
                  employmentType: data.employmentType,
                  vatStatus: data.vatStatus,
                  taxScheme: data.taxScheme,
                  zusStatus: data.zusStatus,
                  receiveEmailCopy: data.receiveEmailCopy,
                };
                await handleCreateWithDuplicateCheck(createDto, customFields);
              } catch {
                // Error is handled by mutation's onError callback
                // Dialog stays open so user can retry
              }
            }}
          />

          {editingClient && (
            <ClientFormDialog
              key={editingClient.id}
              open={!!editingClient}
              onOpenChange={(open) => !open && setEditingClient(null)}
              client={editingClient}
              onSubmit={async (data, customFields) => {
                try {
                  await updateClient.mutateAsync({
                    id: editingClient.id,
                    data: data as UpdateClientDto,
                  });
                  if (customFields && Object.keys(customFields.values).length > 0) {
                    await setCustomFields.mutateAsync({
                      id: editingClient.id,
                      data: customFields,
                    });
                  }
                  setEditingClient(null);
                } catch {
                  // Error is handled by mutation's onError callback
                  // Dialog stays open so user can retry
                }
              }}
            />
          )}
        </>
      )}

      {hasDeletePermission && deletingClient && (
        <ConfirmDialog
          open={!!deletingClient}
          onOpenChange={(open) => !open && setDeletingClient(null)}
          title="Usuń klienta"
          description={`Czy na pewno chcesz usunąć klienta "${deletingClient.name}"? Klient zostanie dezaktywowany i można go będzie przywrócić później.`}
          variant="destructive"
          onConfirm={() => {
            deleteClient.mutate(deletingClient.id, {
              onSuccess: () => setDeletingClient(null),
              onSettled: () => setDeletingClient(null),
            });
          }}
          isLoading={deleteClient.isPending}
        />
      )}

      {restoringClient && (
        <ConfirmDialog
          open={!!restoringClient}
          onOpenChange={(open) => !open && setRestoringClient(null)}
          title="Przywróć klienta"
          description={`Czy na pewno chcesz przywrócić klienta "${restoringClient.name}"?`}
          onConfirm={() => {
            restoreClient.mutate(restoringClient.id, {
              onSuccess: () => setRestoringClient(null),
              onSettled: () => setRestoringClient(null),
            });
          }}
          isLoading={restoreClient.isPending}
        />
      )}

      <ExportImportDialog
        open={exportImportOpen}
        onOpenChange={setExportImportOpen}
        onExport={handleExport}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        isExporting={exportClients.isPending}
        isImporting={importClients.isPending}
      />

      {duplicateCheckResult && (
        <DuplicateWarningDialog
          open={duplicateWarningOpen}
          onOpenChange={setDuplicateWarningOpen}
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
