import { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { useClients, useDeleteClient, useRestoreClient, useSetClientCustomFields } from '@/lib/hooks/use-clients';
import { useCreateClient, useUpdateClient } from '@/lib/hooks/use-clients';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientResponseDto, CreateClientDto, UpdateClientDto, ClientFiltersDto, SetCustomFieldValuesDto } from '@/types/dtos';
import { ClientFormDialog } from '@/components/forms/client-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ClientFilters } from '@/components/clients/client-filters';
import { IconBadgeList } from '@/components/clients/icon-badge';
import { useAuthContext } from '@/contexts/auth-context';
import { EmploymentType, VatStatus, TaxScheme, ZusStatus, UserRole } from '@/types/enums';

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'DG',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 poniżej',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 powyżej',
};

const VAT_STATUS_LABELS: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT M',
  [VatStatus.VAT_QUARTERLY]: 'VAT K',
  [VatStatus.NO]: 'Nie',
  [VatStatus.NO_WATCH_LIMIT]: 'Nie (limit)',
};

const TAX_SCHEME_LABELS: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Ogólne',
};

export default function ClientsListPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const hasWritePermission = true; // Will be checked via RBAC
  const hasDeletePermission = true;

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
  const { data: clients = [], isPending } = useClients(filters);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const restoreClient = useRestoreClient();
  const setCustomFields = useSetClientCustomFields();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientResponseDto | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientResponseDto | null>(null);
  const [restoringClient, setRestoringClient] = useState<ClientResponseDto | null>(null);

  const handleFiltersChange = useCallback((newFilters: ClientFiltersDto) => {
    setFilters(newFilters);
  }, []);

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
              {EMPLOYMENT_TYPE_LABELS[type]}
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
              {VAT_STATUS_LABELS[status]}
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
              {TAX_SCHEME_LABELS[scheme]}
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
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
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
                  onClick={() => navigate(`${basePath}/${client.id}`)}
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
          hasWritePermission && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj klienta
            </Button>
          )
        }
      />

      <ClientFilters filters={filters} onFiltersChange={handleFiltersChange} />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={clients}
            isLoading={isPending}
            onRowClick={(client) => navigate(`${basePath}/${client.id}`)}
          />
        </CardContent>
      </Card>

      {hasWritePermission && (
        <>
          <ClientFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={async (data, customFields) => {
              createClient.mutate(data as CreateClientDto, {
                onSuccess: (newClient) => {
                  if (customFields && Object.keys(customFields.values).length > 0) {
                    setCustomFields.mutate({
                      id: newClient.id,
                      data: customFields,
                    });
                  }
                  setCreateOpen(false);
                },
              });
            }}
          />

          {editingClient && (
            <ClientFormDialog
              open={!!editingClient}
              onOpenChange={(open) => !open && setEditingClient(null)}
              client={editingClient}
              onSubmit={async (data, customFields) => {
                updateClient.mutate({
                  id: editingClient.id,
                  data: data as UpdateClientDto,
                }, {
                  onSuccess: () => {
                    if (customFields && Object.keys(customFields.values).length > 0) {
                      setCustomFields.mutate({
                        id: editingClient.id,
                        data: customFields,
                      });
                    }
                    setEditingClient(null);
                  },
                });
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
            deleteClient.mutate(deletingClient.id);
            setDeletingClient(null);
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
            restoreClient.mutate(restoringClient.id);
            setRestoringClient(null);
          }}
          isLoading={restoreClient.isPending}
        />
      )}
    </div>
  );
}
