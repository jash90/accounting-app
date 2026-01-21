import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { type ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2, Key, Users, UserPlus } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { EmployeeFormDialog } from '@/components/forms/employee-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useEmployees,
  useDeleteEmployee,
  useCreateEmployee,
  useUpdateEmployee,
} from '@/lib/hooks/use-employees';
import { type UserDto } from '@/types/dtos';

const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <div className="font-medium text-apptax-navy">{row.original.email}</div>,
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
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/company/employees/${row.original.id}/permissions`);
            }}
            title="Zarządzaj uprawnieniami"
          >
            <Key className="h-4 w-4 text-apptax-teal" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-apptax-soft-teal"
            onClick={(e) => {
              e.stopPropagation();
              setEditingEmployee(row.original);
            }}
            title="Edytuj pracownika"
          >
            <Edit className="h-4 w-4 text-apptax-blue" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingEmployee(row.original);
            }}
            title="Usuń pracownika"
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
        title="Pracownicy"
        description="Zarządzaj pracownikami firmy"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Button>
        }
      />

      <Card className="border-apptax-soft-teal/30">
        <CardContent className="p-0">
          <DataTable columns={actionColumns} data={employees} isLoading={isPending} />
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => {
          try {
            await createEmployee.mutateAsync(data);
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
              await updateEmployee.mutateAsync({ id: editingEmployee.id, data });
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
