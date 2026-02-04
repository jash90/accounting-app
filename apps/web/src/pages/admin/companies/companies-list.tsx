import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { Building2, Edit, Package, Plus, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { CompanyFormDialog } from '@/components/forms/company-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from '@/lib/hooks/use-companies';
import { type CompanyDto, type CreateCompanyDto, type UpdateCompanyDto } from '@/types/dtos';

const columns: ColumnDef<CompanyDto>[] = [
  {
    accessorKey: 'name',
    header: 'Nazwa',
    cell: ({ row }) => <div className="text-foreground font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: 'owner',
    header: 'Właściciel',
    cell: ({ row }) => {
      const owner = row.original.owner;
      return owner ? (
        <span className="text-muted-foreground">{`${owner.firstName} ${owner.lastName}`}</span>
      ) : (
        <span className="text-muted-foreground">Brak</span>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'muted'}>
        {row.original.isActive ? 'Aktywna' : 'Nieaktywna'}
      </Badge>
    ),
  },
];

export default function CompaniesListPage() {
  const navigate = useNavigate();
  const { data: companies = [], isPending } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyDto | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyDto | null>(null);

  const actionColumns: ColumnDef<CompanyDto>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Akcje',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-accent/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/companies/${row.original.id}/modules`);
            }}
            title="Zarządzaj modułami"
          >
            <Package className="text-accent h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-accent/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCompany(row.original);
            }}
            title="Edytuj firmę"
          >
            <Edit className="text-primary h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-destructive/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingCompany(row.original);
            }}
            title="Usuń firmę"
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firmy"
        description="Zarządzaj firmami w systemie"
        icon={<Building2 className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Utwórz firmę
          </Button>
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={companies} isLoading={isPending} />
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => {
          createCompany.mutate(data as CreateCompanyDto);
          setCreateOpen(false);
        }}
      />

      {editingCompany && (
        <CompanyFormDialog
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
          company={editingCompany}
          onSubmit={(data) => {
            updateCompany.mutate({ id: editingCompany.id, data: data as UpdateCompanyDto });
            setEditingCompany(null);
          }}
        />
      )}

      {deletingCompany && (
        <ConfirmDialog
          open={!!deletingCompany}
          onOpenChange={(open) => !open && setDeletingCompany(null)}
          title="Usuń firmę"
          description={`Czy na pewno chcesz usunąć ${deletingCompany.name}? Tej akcji nie można cofnąć.`}
          variant="destructive"
          onConfirm={() => {
            deleteCompany.mutate(deletingCompany.id);
            setDeletingCompany(null);
          }}
          isLoading={deleteCompany.isPending}
        />
      )}
    </div>
  );
}
