import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useModules, useDeleteModule } from '@/lib/hooks/use-modules';
import { useCreateModule, useUpdateModule } from '@/lib/hooks/use-modules';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { ModuleDto } from '@/types/dtos';
import { ModuleFormDialog } from '@/components/forms/module-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

const columns: ColumnDef<ModuleDto>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-apptax-navy">{row.original.name}</span>
        {row.original.slug === 'ai-agent' && (
          <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
        )}
      </div>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="px-2 py-1 bg-apptax-soft-teal rounded text-sm text-apptax-navy">
        {row.original.slug}
      </code>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-apptax-navy/70 line-clamp-1">{row.original.description}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'muted'}>
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
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              setEditingModule(row.original);
            }}
            title="Edit module"
          >
            <Edit className="h-4 w-4 text-apptax-blue" />
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
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Manage system modules"
        icon={<Package className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Module
          </Button>
        }
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={modules} isLoading={isPending} />
        </CardContent>
      </Card>

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
