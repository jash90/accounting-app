import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useSimpleTexts, useDeleteSimpleText } from '@/lib/hooks/use-simple-text';
import { useCreateSimpleText, useUpdateSimpleText } from '@/lib/hooks/use-simple-text';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SimpleTextResponseDto } from '@/types/dtos';
import { SimpleTextFormDialog } from '@/components/forms/simple-text-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthContext } from '@/contexts/auth-context';
import { ModulePermission } from '@/types/enums';

const columns: ColumnDef<SimpleTextResponseDto>[] = [
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => (
      <div className="max-w-md truncate">{row.original.content}</div>
    ),
  },
  {
    accessorKey: 'createdBy',
    header: 'Created By',
    cell: ({ row }) => {
      const createdBy = row.original.createdBy;
      return createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : 'N/A';
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      return new Date(row.original.createdAt).toLocaleDateString();
    },
  },
];

export default function SimpleTextListPage() {
  const { user } = useAuthContext();
  
  // For COMPANY_OWNER, they have full access
  // For EMPLOYEE, permissions are checked on the backend
  // For now, we'll show UI based on role - backend will enforce permissions
  const hasWritePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE';
  const hasDeletePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE';

  const { data: texts = [], isPending } = useSimpleTexts();
  const createText = useCreateSimpleText();
  const updateText = useUpdateSimpleText();
  const deleteText = useDeleteSimpleText();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingText, setEditingText] = useState<SimpleTextResponseDto | null>(null);
  const [deletingText, setDeletingText] = useState<SimpleTextResponseDto | null>(null);

  const actionColumns: ColumnDef<SimpleTextResponseDto>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {hasWritePermission && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                setEditingText(row.original);
              }}
              title="Edit text"
            >
              <Edit className="h-4 w-4 text-primary" />
            </Button>
          )}
          {hasDeletePermission && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingText(row.original);
              }}
              title="Delete text"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Simple Text"
        description="Manage simple text entries"
        action={
          hasWritePermission && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Text
            </Button>
          )
        }
      />

      <div className="mt-6">
        <DataTable columns={actionColumns} data={texts} isLoading={isPending} />
      </div>

      {hasWritePermission && (
        <>
          <SimpleTextFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={(data) => {
              createText.mutate(data);
              setCreateOpen(false);
            }}
          />

          {editingText && (
            <SimpleTextFormDialog
              open={!!editingText}
              onOpenChange={(open) => !open && setEditingText(null)}
              text={editingText}
              onSubmit={(data) => {
                updateText.mutate({ id: editingText.id, data });
                setEditingText(null);
              }}
            />
          )}
        </>
      )}

      {hasDeletePermission && deletingText && (
        <ConfirmDialog
          open={!!deletingText}
          onOpenChange={(open) => !open && setDeletingText(null)}
          title="Delete Text"
          description={`Are you sure you want to delete this text? This action cannot be undone.`}
          variant="destructive"
          onConfirm={() => {
            deleteText.mutate(deletingText.id);
            setDeletingText(null);
          }}
          isLoading={deleteText.isPending}
        />
      )}
    </div>
  );
}

