import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '../api/endpoints/modules';
import { queryKeys } from '../api/query-client';
import { CreateModuleDto, UpdateModuleDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

export function useModules() {
  return useQuery({
    queryKey: queryKeys.modules.all,
    queryFn: modulesApi.getAll,
  });
}

export function useModule(id: string) {
  return useQuery({
    queryKey: queryKeys.modules.detail(id),
    queryFn: () => modulesApi.getById(id),
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
        title: 'Success',
        description: 'Module created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create module',
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
        title: 'Success',
        description: 'Module updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update module',
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
        title: 'Success',
        description: 'Module deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete module',
        variant: 'destructive',
      });
    },
  });
}

