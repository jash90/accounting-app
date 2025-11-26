import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useEmployees, useDeleteEmployee } from '@/lib/hooks/use-employees';
import { useCreateEmployee, useUpdateEmployee } from '@/lib/hooks/use-employees';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Key, Users, UserPlus } from 'lucide-react';
import { UserDto } from '@/types/dtos';
import { EmployeeFormDialog } from '@/components/forms/employee-form-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useNavigate } from 'react-router-dom';

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
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'muted'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
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
      header: 'Actions',
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
            title="Manage permissions"
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
            title="Edit employee"
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
            title="Delete employee"
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
        title="Employees"
        description="Manage your company employees"
        icon={<Users className="h-6 w-6" />}
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
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
        onSubmit={(data) => {
          createEmployee.mutate(data);
          setCreateOpen(false);
        }}
      />

      {editingEmployee && (
        <EmployeeFormDialog
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          employee={editingEmployee}
          onSubmit={(data) => {
            updateEmployee.mutate({ id: editingEmployee.id, data });
            setEditingEmployee(null);
          }}
        />
      )}

      {deletingEmployee && (
        <ConfirmDialog
          open={!!deletingEmployee}
          onOpenChange={(open) => !open && setDeletingEmployee(null)}
          title="Delete Employee"
          description={`Are you sure you want to delete ${deletingEmployee.email}? This action cannot be undone.`}
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
