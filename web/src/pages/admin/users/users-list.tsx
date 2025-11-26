import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useUsers, useDeleteUser } from '@/lib/hooks/use-users';
import { useCreateUser, useUpdateUser } from '@/lib/hooks/use-users';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import { UserDto, UserRole } from '@/types/dtos';
import { UserFormDialog } from '@/components/forms/user-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';

const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="font-medium text-apptax-navy">{row.original.email}</div>
    ),
  },
  {
    accessorKey: 'firstName',
    header: 'First Name',
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original.role;
      const variant = role === UserRole.ADMIN ? 'destructive' : role === UserRole.COMPANY_OWNER ? 'default' : 'muted';
      return <Badge variant={variant}>{role}</Badge>;
    },
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
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
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
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              setEditingUser(row.original);
            }}
            title="Edit user"
          >
            <Edit className="h-4 w-4 text-apptax-blue" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingUser(row.original);
            }}
            title="Delete user"
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
        title="Users"
        description="Manage system users and their roles"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        }
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={users} isLoading={isPending} />
        </CardContent>
      </Card>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => {
          createUser.mutate(data);
          setCreateOpen(false);
        }}
      />

      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSubmit={(data) => {
            updateUser.mutate({ id: editingUser.id, data });
            setEditingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          title="Delete User"
          description={`Are you sure you want to delete ${deletingUser.email}? This action cannot be undone.`}
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
