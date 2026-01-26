import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { UserRole, type CreateUserDto, type UpdateUserDto, type UserDto } from '@/types/dtos';
import { type ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2, UserPlus, Users } from 'lucide-react';
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '@/lib/hooks/use-users';
import { UserFormDialog } from '@/components/forms/user-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <div className="text-foreground font-medium">{row.original.email}</div>,
  },
  {
    accessorKey: 'firstName',
    header: 'Imię',
  },
  {
    accessorKey: 'lastName',
    header: 'Nazwisko',
  },
  {
    accessorKey: 'role',
    header: 'Rola',
    cell: ({ row }) => {
      const role = row.original.role;
      const variant =
        role === UserRole.ADMIN
          ? 'destructive'
          : role === UserRole.COMPANY_OWNER
            ? 'default'
            : 'muted';
      return <Badge variant={variant}>{role}</Badge>;
    },
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
  {
    id: 'actions',
    header: 'Akcje',
    cell: ({ row: _row }) => {
      // Actions will be handled by the parent component
      return null;
    },
  },
];

export default function UsersListPage() {
  const { data: users = [], isPending } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserDto | null>(null);

  const actionColumns: ColumnDef<UserDto>[] = [
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
              setEditingUser(row.original);
            }}
            title="Edytuj użytkownika"
          >
            <Edit className="text-primary h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-destructive/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingUser(row.original);
            }}
            title="Usuń użytkownika"
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
        title="Użytkownicy"
        description="Zarządzaj użytkownikami systemu i ich rolami"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Utwórz użytkownika
          </Button>
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={users} isLoading={isPending} />
        </CardContent>
      </Card>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => {
          try {
            await createUser.mutateAsync(data as CreateUserDto);
            setCreateOpen(false);
          } catch {
            // Error handled by mutation's onError
          }
        }}
      />

      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSubmit={async (data) => {
            try {
              await updateUser.mutateAsync({ id: editingUser.id, data: data as UpdateUserDto });
              setEditingUser(null);
            } catch {
              // Error handled by mutation's onError
            }
          }}
        />
      )}

      {deletingUser && (
        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          title="Usuń użytkownika"
          description={`Czy na pewno chcesz usunąć ${deletingUser.email}? Tej akcji nie można cofnąć.`}
          variant="destructive"
          onConfirm={() => {
            deleteUser.mutate(deletingUser.id);
            setDeletingUser(null);
          }}
          isLoading={deleteUser.isPending}
        />
      )}
    </div>
  );
}
