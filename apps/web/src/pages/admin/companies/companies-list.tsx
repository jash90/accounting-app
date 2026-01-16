import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useCompanies, useDeleteCompany } from '@/lib/hooks/use-companies';
import { useCreateCompany, useUpdateCompany } from '@/lib/hooks/use-companies';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Package, Building2 } from 'lucide-react';
import { CompanyDto } from '@/types/dtos';
import { CompanyFormDialog } from '@/components/forms/company-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const columns: ColumnDef<CompanyDto>[] = [
  {
    accessorKey: 'name',
    header: 'Nazwa',
    cell: ({ row }) => (
      <div className="font-medium text-apptax-navy">{row.original.name}</div>
    ),
  },
  {
    accessorKey: 'owner',
    header: 'Właściciel',
    cell: ({ row }) => {
      const owner = row.original.owner;
      return owner ? (
        <span className="text-gray-600">{`${owner.firstName} ${owner.lastName}`}</span>
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
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/companies/${row.original.id}/modules`);
            }}
            title="Zarządzaj modułami"
          >
            <Package className="h-4 w-4 text-apptax-teal" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCompany(row.original);
            }}
            title="Edytuj firmę"
          >
            <Edit className="h-4 w-4 text-apptax-blue" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingCompany(row.original);
            }}
            title="Usuń firmę"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
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
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Utwórz firmę
          </Button>
        }
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={companies} isLoading={isPending} />
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => {
          createCompany.mutate(data);
          setCreateOpen(false);
        }}
      />

      {editingCompany && (
        <CompanyFormDialog
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
          company={editingCompany}
          onSubmit={(data) => {
            updateCompany.mutate({ id: editingCompany.id, data });
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
