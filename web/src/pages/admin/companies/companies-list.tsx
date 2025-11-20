import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useCompanies, useDeleteCompany } from '@/lib/hooks/use-companies';
import { useCreateCompany, useUpdateCompany } from '@/lib/hooks/use-companies';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { CompanyDto } from '@/types/dtos';
import { CompanyFormDialog } from '@/components/forms/company-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const columns: ColumnDef<CompanyDto>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: 'owner',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.original.owner;
      return owner ? `${owner.firstName} ${owner.lastName}` : 'N/A';
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
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
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/companies/${row.original.id}/modules`);
            }}
            title="Manage modules"
          >
            <Package className="h-4 w-4 text-primary" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCompany(row.original);
            }}
            title="Edit company"
          >
            <Edit className="h-4 w-4 text-primary" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingCompany(row.original);
            }}
            title="Delete company"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage companies in the system"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Company
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable columns={actionColumns} data={companies} isLoading={isPending} />
      </div>

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
          title="Delete Company"
          description={`Are you sure you want to delete ${deletingCompany.name}? This action cannot be undone.`}
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

