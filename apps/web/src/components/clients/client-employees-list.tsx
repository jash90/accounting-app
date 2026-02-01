import { useState } from 'react';

import { ArchiveRestore, Edit, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useClientEmployees,
  useDeleteClientEmployee,
  useRestoreClientEmployee,
} from '@/lib/hooks/use-clients';
import { type ClientEmployeeFiltersDto, type ClientEmployeeResponseDto } from '@/types/dtos';
import {
  EmployeeContractType,
  EmployeeContractTypeColors,
  EmployeeContractTypeLabels,
} from '@/types/enums';

import { ClientEmployeeFormDialog } from './client-employee-form-dialog';

interface ClientEmployeesListProps {
  clientId: string;
  clientName: string;
}

function formatDate(date?: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL');
}

export function ClientEmployeesList({ clientId, clientName }: ClientEmployeesListProps) {
  const [filters, setFilters] = useState<ClientEmployeeFiltersDto>({
    isActive: true,
  });
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ClientEmployeeResponseDto | undefined>();

  const { data, isPending, error } = useClientEmployees(clientId, filters);
  const deleteEmployee = useDeleteClientEmployee();
  const restoreEmployee = useRestoreClientEmployee();

  const employees = data?.data ?? [];

  const handleEdit = (employee: ClientEmployeeResponseDto) => {
    setSelectedEmployee(employee);
    setFormDialogOpen(true);
  };

  const handleDelete = (employee: ClientEmployeeResponseDto) => {
    if (
      window.confirm(
        `Czy na pewno chcesz usunąć pracownika ${employee.firstName} ${employee.lastName}?`
      )
    ) {
      deleteEmployee.mutate({ clientId, employeeId: employee.id });
    }
  };

  const handleRestore = (employee: ClientEmployeeResponseDto) => {
    restoreEmployee.mutate({ clientId, employeeId: employee.id });
  };

  const handleAddNew = () => {
    setSelectedEmployee(undefined);
    setFormDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setFormDialogOpen(false);
    setSelectedEmployee(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pracownicy klienta
          </CardTitle>
          <Button onClick={handleAddNew} className="bg-apptax-blue hover:bg-apptax-blue/90">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <Select
            value={filters.contractType ?? 'all'}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                contractType: value === 'all' ? undefined : (value as EmployeeContractType),
              }))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Typ umowy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie typy</SelectItem>
              {Object.entries(EmployeeContractTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'
            }
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                isActive: value === 'all' ? undefined : value === 'active',
              }))
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              <SelectItem value="active">Aktywni</SelectItem>
              <SelectItem value="inactive">Nieaktywni</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive py-8 text-center">
            Błąd podczas ładowania pracowników
          </div>
        ) : employees.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            Brak pracowników dla tego klienta
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Typ umowy</TableHead>
                  <TableHead>Stanowisko</TableHead>
                  <TableHead>Data rozpoczęcia</TableHead>
                  <TableHead>Wynagrodzenie</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className={!employee.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        {!employee.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Nieaktywny
                          </Badge>
                        )}
                      </div>
                      {employee.email && (
                        <div className="text-muted-foreground text-sm">{employee.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={EmployeeContractTypeColors[employee.contractType]}>
                        {EmployeeContractTypeLabels[employee.contractType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.position || '-'}</TableCell>
                    <TableCell>{formatDate(employee.startDate)}</TableCell>
                    <TableCell>
                      {employee.contractType === EmployeeContractType.UMOWA_O_DZIELO
                        ? employee.agreedAmountPln || '-'
                        : employee.contractType === EmployeeContractType.UMOWA_ZLECENIE
                          ? employee.hourlyRatePln
                            ? `${employee.hourlyRatePln}/h`
                            : '-'
                          : employee.grossSalaryPln || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(employee)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          {employee.isActive ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(employee)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Usuń
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRestore(employee)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Przywróć
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination info */}
        {data && data.total > 0 && (
          <div className="text-muted-foreground mt-4 text-sm">
            Wyświetlono {employees.length} z {data.total} pracowników
          </div>
        )}

        {/* Form Dialog */}
        <ClientEmployeeFormDialog
          open={formDialogOpen}
          onOpenChange={handleCloseDialog}
          clientId={clientId}
          clientName={clientName}
          employee={selectedEmployee}
        />
      </CardContent>
    </Card>
  );
}
