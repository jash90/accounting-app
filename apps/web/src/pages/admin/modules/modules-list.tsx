import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { getModuleIcon } from '@/lib/utils/module-icons';
import { type CreateModuleDto, type ModuleDto, type UpdateModuleDto } from '@/types/dtos';
import { type ColumnDef } from '@tanstack/react-table';
import { Edit, Package, Plus, Trash2 } from 'lucide-react';
import {
  useCreateModule,
  useDeleteModule,
  useModules,
  useUpdateModule,
} from '@/lib/hooks/use-modules';
import { ModuleFormDialog } from '@/components/forms/module-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const columns: ColumnDef<ModuleDto>[] = [
  {
    accessorKey: 'name',
    header: 'Nazwa',
    cell: ({ row }) => {
      const ModuleIcon = getModuleIcon(row.original.icon);
      const isAiModule = row.original.slug === 'ai-agent';
      return (
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isAiModule ? 'bg-accent ai-glow' : 'bg-primary'
            }`}
          >
            <ModuleIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-foreground font-medium">{row.original.name}</span>
          {isAiModule && <div className="bg-accent ai-glow h-2 w-2 rounded-full" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="bg-accent/10 text-foreground rounded px-2 py-1 text-sm">
        {row.original.slug}
      </code>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Opis',
    cell: ({ row }) => (
      <span className="text-foreground/70 line-clamp-1">{row.original.description}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'muted'}>
        {row.original.isActive ? 'Aktywny' : 'Nieaktywny'}
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
      header: 'Akcje',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-accent/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingModule(row.original);
            }}
            title="Edytuj moduł"
          >
            <Edit className="text-primary h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-destructive/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingModule(row.original);
            }}
            title="Usuń moduł"
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
        title="Moduły"
        description="Zarządzaj modułami systemu"
        icon={<Package className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Utwórz moduł
          </Button>
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={modules} isLoading={isPending} />
        </CardContent>
      </Card>

      <ModuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => {
          createModule.mutate(data as CreateModuleDto);
          setCreateOpen(false);
        }}
      />

      {editingModule && (
        <ModuleFormDialog
          open={!!editingModule}
          onOpenChange={(open) => !open && setEditingModule(null)}
          module={editingModule}
          onSubmit={(data) => {
            updateModule.mutate({ id: editingModule.id, data: data as UpdateModuleDto });
            setEditingModule(null);
          }}
        />
      )}

      {deletingModule && (
        <ConfirmDialog
          open={!!deletingModule}
          onOpenChange={(open) => !open && setDeletingModule(null)}
          title="Usuń moduł"
          description={`Czy na pewno chcesz usunąć ${deletingModule.name}? Tej akcji nie można cofnąć.`}
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
