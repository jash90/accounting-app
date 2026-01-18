import { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
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
} from '@/lib/hooks/use-clients';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Upload,
  BarChart3,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientResponseDto, CreateClientDto, UpdateClientDto, ClientFiltersDto } from '@/types/dtos';
import { ClientFormDialog } from '@/components/forms/client-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ClientFilters } from '@/components/clients/client-filters';
import { IconBadgeList } from '@/components/clients/icon-badge';
import { BulkActionsToolbar, BulkEditChanges } from '@/components/clients/bulk-actions-toolbar';
import { ExportImportDialog } from '@/components/clients/export-import-dialog';
import { DuplicateWarningDialog } from '@/components/clients/duplicate-warning-dialog';
import { StatisticsDashboard } from '@/components/clients/statistics-dashboard';
import { DuplicateCheckResultDto } from '@/lib/api/endpoints/clients';
import { useAuthContext } from '@/contexts/auth-context';
import {
  EmploymentTypeLabels,
  VatStatus,
  VatStatusLabels,
  TaxSchemeLabels,
  UserRole,
} from '@/types/enums';

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
  const [showStatistics, setShowStatistics] = useState(true);
  const [exportImportOpen, setExportImportOpen] = useState(false);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResultDto | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<{ data: CreateClientDto; customFields?: { values: Record<string, unknown> } } | null>(null);

  const handleFiltersChange = useCallback((newFilters: ClientFiltersDto) => {
    setFilters(newFilters);
  }, []);

  const handleBulkDelete = useCallback((clientIds: string[]) => {
    bulkDelete.mutate({ clientIds }, {
      onSuccess: () => setSelectedClients([]),
    });
  }, [bulkDelete]);

  const handleBulkRestore = useCallback((clientIds: string[]) => {
    bulkRestore.mutate({ clientIds }, {
      onSuccess: () => setSelectedClients([]),
    });
  }, [bulkRestore]);

  const handleBulkEdit = useCallback((clientIds: string[], changes: BulkEditChanges) => {
    bulkEdit.mutate({ clientIds, ...changes }, {
      onSuccess: () => setSelectedClients([]),
    });
  }, [bulkEdit]);

  const handleExport = useCallback(async () => {
    await exportClients.mutateAsync(filters);
  }, [exportClients, filters]);

  const handleImport = useCallback(async (file: File) => {
    const result = await importClients.mutateAsync(file);
    return result;
  }, [importClients]);

  const handleDownloadTemplate = useCallback(async () => {
    await downloadTemplate.mutateAsync();
  }, [downloadTemplate]);

  const handleCreateWithDuplicateCheck = useCallback(async (data: CreateClientDto, customFields?: { values: Record<string, unknown> }) => {
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
  }, [checkDuplicates]);

  const createClientAndClose = async (data: CreateClientDto, customFields?: { values: Record<string, unknown> }) => {
    const newClient = await createClient.mutateAsync(data);
    if (customFields && Object.keys(customFields.values).length > 0) {
      await setCustomFields.mutateAsync({
        id: newClient.id,
        data: customFields,
      });
    }
    setCreateOpen(false);
  };

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
  }, [pendingCreateData]);

  const handleCancelDuplicate = useCallback(() => {
    setDuplicateWarningOpen(false);
    setDuplicateCheckResult(null);
    setPendingCreateData(null);
  }, []);

  const handleClientClick = useCallback((clientId: string) => {
    navigate(`${basePath}/${clientId}`);
  }, [navigate, basePath]);

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
          const icons = row.original.iconAssignments
            ?.map((assignment) => assignment.icon)
            .filter((icon): icon is NonNullable<typeof icon> => icon !== undefined && icon !== null) || [];

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
          <span className="text-apptax-navy/80 font-mono text-sm">
            {row.original.nip || '-'}
          </span>
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
            <Badge
              variant={status === VatStatus.NO ? 'outline' : 'default'}
              className="text-xs"
            >
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
                <DropdownMenuItem
                  onClick={() => navigate(`${basePath}/${client.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Szczegóły
                </DropdownMenuItem>

                {hasWritePermission && client.isActive && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    setEditingClient(client);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => navigate(`${basePath}/${client.id}#changelog`)}
                >
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
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    setRestoringClient(client);
                  }}>
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
    [navigate, hasWritePermission, hasDeletePermission, basePath]
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatistics(!showStatistics)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {showStatistics ? 'Ukryj statystyki' : 'Statystyki'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportImportOpen(true)}
            >
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
          <DataTable
            columns={columns}
            data={clients}
            isLoading={isPending}
            onRowClick={(client) => navigate(`${basePath}/${client.id}`)}
            selectable
            selectedRows={selectedClients}
            onSelectionChange={setSelectedClients}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>

      {hasWritePermission && (
        <>
          <ClientFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={async (data, customFields) => {
              try {
                await handleCreateWithDuplicateCheck(data as CreateClientDto, customFields);
              } catch {
                // Error is handled by mutation's onError callback
                // Dialog stays open so user can retry
              }
            }}
          />

          {editingClient && (
            <ClientFormDialog
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
