import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useSimpleTexts, useDeleteSimpleText } from '@/lib/hooks/use-simple-text';
import { useCreateSimpleText, useUpdateSimpleText } from '@/lib/hooks/use-simple-text';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SimpleTextResponseDto, CreateSimpleTextDto, UpdateSimpleTextDto } from '@/types/dtos';
import { SimpleTextFormDialog } from '@/components/forms/simple-text-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthContext } from '@/contexts/auth-context';
import { ModulePermission } from '@/types/enums';

// Base columns for all users
const baseColumns: ColumnDef<SimpleTextResponseDto>[] = [
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
  // For ADMIN, can create/edit/delete their own entries (companyId = null)
  const hasWritePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';
  const hasDeletePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';

  // Dynamic columns - add company column for admins
  const columns: ColumnDef<SimpleTextResponseDto>[] = useMemo(() => {
    if (user?.role === 'ADMIN') {
      return [
        baseColumns[0], // content
        {
          accessorKey: 'company',
          header: 'Company',
          cell: ({ row }) => {
            const company = row.original.company;
            const isSystemEntry = company?.isSystemCompany === true;

            if (isSystemEntry) {
              return (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">System Admin</span>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    Admin Entry
                  </span>
                </div>
              );
            }

            return company ? (
              <div className="font-medium">{company.name}</div>
            ) : (
              <div className="text-muted-foreground">No Company</div>
            );
          },
        },
        baseColumns[1], // createdBy
        baseColumns[2], // createdAt
      ];
    }
    return baseColumns;
  }, [user?.role]);

  const { data: texts = [], isPending } = useSimpleTexts();
  const createText = useCreateSimpleText();
  const updateText = useUpdateSimpleText();
  const deleteText = useDeleteSimpleText();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingText, setEditingText] = useState<SimpleTextResponseDto | null>(null);
  const [deletingText, setDeletingText] = useState<SimpleTextResponseDto | null>(null);

  // Add actions column with conditional buttons based on ownership
  const actionColumns: ColumnDef<SimpleTextResponseDto>[] = useMemo(() => {
    return [
      ...columns,
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const text = row.original;
          const isSystemEntry = text.company?.isSystemCompany === true;

          // Determine if current user can modify this entry
          const canModify = user?.role === 'ADMIN'
            ? isSystemEntry // Admins can only modify system company entries
            : text.companyId === user?.companyId; // Company users can only modify their company's entries

          return (
            <div className="flex gap-1">
              {canModify && hasWritePermission && (
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
              {canModify && hasDeletePermission && (
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
          );
        },
      },
    ];
  }, [columns, user?.role, user?.companyId, hasWritePermission, hasDeletePermission]);

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
              createText.mutate(data as CreateSimpleTextDto);
              setCreateOpen(false);
            }}
          />

          {editingText && (
            <SimpleTextFormDialog
              open={!!editingText}
              onOpenChange={(open) => !open && setEditingText(null)}
              text={editingText}
              onSubmit={(data) => {
                updateText.mutate({ id: editingText.id, data: data as UpdateSimpleTextDto });
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

