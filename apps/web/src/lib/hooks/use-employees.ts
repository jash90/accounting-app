import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/endpoints/employees';
import { queryKeys } from '../api/query-client';
import { CreateEmployeeDto, UpdateEmployeeDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';
import { ApiErrorResponse } from '@/types/api';

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: employeesApi.getAll,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (employeeData: CreateEmployeeDto) => employeesApi.create(employeeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({
        title: 'Sukces',
        description: 'Pracownik został utworzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć pracownika',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeDto }) =>
      employeesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Pracownik został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować pracownika',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({
        title: 'Sukces',
        description: 'Pracownik został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć pracownika',
        variant: 'destructive',
      });
    },
  });
}

