import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useSimpleTexts, useDeleteSimpleText } from '@/lib/hooks/use-simple-text';
import { useCreateSimpleText, useUpdateSimpleText } from '@/lib/hooks/use-simple-text';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { SimpleTextResponseDto, CreateSimpleTextDto, UpdateSimpleTextDto } from '@/types/dtos';
import { SimpleTextFormDialog } from '@/components/forms/simple-text-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthContext } from '@/contexts/auth-context';
import { ModulePermission } from '@/types/enums';

const baseColumns: ColumnDef<SimpleTextResponseDto>[] = [
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => (
      <div className="max-w-md truncate text-apptax-navy/80">{row.original.content}</div>
    ),
  },
  {
    accessorKey: 'createdBy',
    header: 'Created By',
    cell: ({ row }) => {
      const createdBy = row.original.createdBy;
      return createdBy ? (
        <span className="text-apptax-navy font-medium">{`${createdBy.firstName} ${createdBy.lastName}`}</span>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      return (
        <span className="text-apptax-navy/60">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      );
    },
  },
];

export default function SimpleTextListPage() {
  const { user } = useAuthContext();

  const hasWritePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';
  const hasDeletePermission = user?.role === 'COMPANY_OWNER' || user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';

  const columns: ColumnDef<SimpleTextResponseDto>[] = useMemo(() => {
    if (user?.role === 'ADMIN') {
      return [
        baseColumns[0],
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
                  <Badge variant="default" className="text-xs">
                    Admin Entry
                  </Badge>
                </div>
              );
            }

            return company ? (
              <div className="font-medium text-apptax-navy">{company.name}</div>
            ) : (
              <div className="text-muted-foreground">No Company</div>
            );
          },
        },
        baseColumns[1],
        baseColumns[2],
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

  const actionColumns: ColumnDef<SimpleTextResponseDto>[] = useMemo(() => {
    return [
      ...columns,
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const text = row.original;
          const isSystemEntry = text.company?.isSystemCompany === true;

          const canModify = user?.role === 'ADMIN'
            ? isSystemEntry
            : text.companyId === user?.companyId;

          return (
            <div className="flex gap-1">
              {canModify && hasWritePermission && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-apptax-soft-teal"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingText(row.original);
                  }}
                  title="Edit text"
                >
                  <Edit className="h-4 w-4 text-apptax-blue" />
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
    <div className="space-y-6">
      <PageHeader
        title="Simple Text"
        description="Manage simple text entries"
        icon={<FileText className="h-6 w-6" />}
        action={
          hasWritePermission && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Text
            </Button>
          )
        }
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={texts} isLoading={isPending} />
        </CardContent>
      </Card>

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
