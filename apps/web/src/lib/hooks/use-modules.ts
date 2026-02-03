import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import { type CreateModuleDto, type UpdateModuleDto } from '@/types/dtos';


import { modulesApi } from '../api/endpoints/modules';
import { queryKeys } from '../api/query-client';

export function useModules() {
  return useQuery({
    queryKey: queryKeys.modules.all,
    queryFn: modulesApi.getAll,
  });
}

export function useModule(id: string) {
  return useQuery({
    queryKey: queryKeys.modules.detail(id),
    queryFn: () => modulesApi.getByIdentifier(id),
    enabled: !!id,
  });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (moduleData: CreateModuleDto) => modulesApi.create(moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast({
        title: 'Sukces',
        description: 'Moduł został utworzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć modułu',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModuleDto }) =>
      modulesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Moduł został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować modułu',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => modulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
      toast({
        title: 'Sukces',
        description: 'Moduł został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć modułu',
        variant: 'destructive',
      });
    },
  });
}
