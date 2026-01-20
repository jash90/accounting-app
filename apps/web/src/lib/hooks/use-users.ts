import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { usersApi } from '../api/endpoints/users';
import { queryKeys } from '../api/query-client';
import { CreateUserDto, UpdateUserDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: usersApi.getAll,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userData: CreateUserDto) => usersApi.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      // Invalidate available owners in case a new COMPANY_OWNER was created
      queryClient.invalidateQueries({ queryKey: ['available-owners'] });
      // Invalidate companies in case a company was created with COMPANY_OWNER
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      toast({
        title: 'Sukces',
        description: 'Użytkownik został utworzony',
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć użytkownika',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Użytkownik został zaktualizowany',
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować użytkownika',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({
        title: 'Sukces',
        description: 'Użytkownik został usunięty',
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć użytkownika',
        variant: 'destructive',
      });
    },
  });
}

export function useAvailableOwners() {
  return useQuery({
    queryKey: ['available-owners'],
    queryFn: usersApi.getAvailableOwners,
  });
}

