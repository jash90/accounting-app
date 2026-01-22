import { useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { ModuleFormDialog } from '@/components/forms/module-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useModules,
  useDeleteModule,
  useCreateModule,
  useUpdateModule,
} from '@/lib/hooks/use-modules';
import { getModuleIcon } from '@/lib/utils/module-icons';
import { type ModuleDto, type CreateModuleDto, type UpdateModuleDto } from '@/types/dtos';

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
              isAiModule ? 'bg-apptax-ai-gradient ai-glow' : 'bg-apptax-gradient'
            }`}
          >
            <ModuleIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-apptax-navy font-medium">{row.original.name}</span>
          {isAiModule && <div className="bg-apptax-teal ai-glow h-2 w-2 rounded-full" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="bg-apptax-soft-teal text-apptax-navy rounded px-2 py-1 text-sm">
        {row.original.slug}
      </code>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Opis',
    cell: ({ row }) => (
      <span className="text-apptax-navy/70 line-clamp-1">{row.original.description}</span>
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
            className="hover:bg-apptax-soft-teal h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingModule(row.original);
            }}
            title="Edytuj moduł"
          >
            <Edit className="text-apptax-blue h-4 w-4" />
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
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Utwórz moduł
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
