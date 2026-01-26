import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { type CreateEmployeeDto, type UpdateEmployeeDto, type UserDto } from '@/types/dtos';
import { type ColumnDef } from '@tanstack/react-table';
import { Edit, Key, Trash2, UserPlus, Users } from 'lucide-react';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from '@/lib/hooks/use-employees';
import { EmployeeFormDialog } from '@/components/forms/employee-form-dialog';
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
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'muted'}>
        {row.original.isActive ? 'Aktywny' : 'Nieaktywny'}
      </Badge>
    ),
  },
];

export default function EmployeesListPage() {
  const navigate = useNavigate();
  const { data: employees = [], isPending } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserDto | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<UserDto | null>(null);

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
              navigate(`/company/employees/${row.original.id}/permissions`);
            }}
            title="Zarządzaj uprawnieniami"
          >
            <Key className="text-accent h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-accent/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingEmployee(row.original);
            }}
            title="Edytuj pracownika"
          >
            <Edit className="text-primary h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-destructive/10 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingEmployee(row.original);
            }}
            title="Usuń pracownika"
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
        title="Pracownicy"
        description="Zarządzaj pracownikami firmy"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Button>
        }
      />

      <Card className="border-border">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={employees} isLoading={isPending} />
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => {
          try {
            await createEmployee.mutateAsync(data as CreateEmployeeDto);
            setCreateOpen(false);
          } catch {
            // Error handled by mutation's onError
          }
        }}
      />

      {editingEmployee && (
        <EmployeeFormDialog
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          employee={editingEmployee}
          onSubmit={async (data) => {
            try {
              await updateEmployee.mutateAsync({
                id: editingEmployee.id,
                data: data as UpdateEmployeeDto,
              });
              setEditingEmployee(null);
            } catch {
              // Error handled by mutation's onError
            }
          }}
        />
      )}

      {deletingEmployee && (
        <ConfirmDialog
          open={!!deletingEmployee}
          onOpenChange={(open) => !open && setDeletingEmployee(null)}
          title="Usuń pracownika"
          description={`Czy na pewno chcesz usunąć ${deletingEmployee.email}? Tej akcji nie można cofnąć.`}
          variant="destructive"
          onConfirm={() => {
            deleteEmployee.mutate(deletingEmployee.id);
            setDeletingEmployee(null);
          }}
          isLoading={deleteEmployee.isPending}
        />
      )}
    </div>
  );
}
