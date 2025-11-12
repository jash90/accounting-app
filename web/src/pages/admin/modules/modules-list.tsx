import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useModules, useDeleteModule } from '@/lib/hooks/use-modules';
import { useCreateModule, useUpdateModule } from '@/lib/hooks/use-modules';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ModuleDto } from '@/types/dtos';
import { ModuleFormDialog } from '@/components/forms/module-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const columns: ColumnDef<ModuleDto>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
  },
  {
    accessorKey: 'description',
    header: 'Description',
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

export default function ModulesListPage() {
  const { data: modules = [], isPending } = useModules();
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleDto | null>(null);
  const [deletingModule, setDeletingModule] = useState<ModuleDto | null>(null);

  const actionColumns: ColumnDef<ModuleDto>[] = [
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
              setEditingModule(row.original);
            }}
            title="Edit module"
          >
            <Edit className="h-4 w-4 text-primary" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingModule(row.original);
            }}
            title="Delete module"
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
        title="Modules"
        description="Manage system modules"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Module
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable columns={actionColumns} data={modules} isLoading={isPending} />
      </div>

      <ModuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => {
          createModule.mutate(data);
          setCreateOpen(false);
        }}
      />

      {editingModule && (
        <ModuleFormDialog
          open={!!editingModule}
          onOpenChange={(open) => !open && setEditingModule(null)}
          module={editingModule}
          onSubmit={(data) => {
            updateModule.mutate({ id: editingModule.id, data });
            setEditingModule(null);
          }}
        />
      )}

      {deletingModule && (
        <ConfirmDialog
          open={!!deletingModule}
          onOpenChange={(open) => !open && setDeletingModule(null)}
          title="Delete Module"
          description={`Are you sure you want to delete ${deletingModule.name}? This action cannot be undone.`}
          variant="destructive"
          onConfirm={() => {
            deleteModule.mutate(deletingModule.id);
            setDeletingModule(null);
          }}
          isLoading={deleteModule.isPending}
        />
      )}
    </div>
  );
}

