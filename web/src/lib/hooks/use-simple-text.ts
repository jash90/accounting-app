import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simpleTextApi } from '../api/endpoints/simple-text';
import { queryKeys } from '../api/query-client';
import { CreateSimpleTextDto, UpdateSimpleTextDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

export function useSimpleTexts() {
  return useQuery({
    queryKey: queryKeys.simpleText.all,
    queryFn: simpleTextApi.getAll,
  });
}

export function useSimpleText(id: string) {
  return useQuery({
    queryKey: queryKeys.simpleText.detail(id),
    queryFn: () => simpleTextApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSimpleText() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (textData: CreateSimpleTextDto) => simpleTextApi.create(textData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      toast({
        title: 'Success',
        description: 'Text created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create text',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSimpleText() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSimpleTextDto }) =>
      simpleTextApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.detail(variables.id) });
      toast({
        title: 'Success',
        description: 'Text updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update text',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSimpleText() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => simpleTextApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      toast({
        title: 'Success',
        description: 'Text deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete text',
        variant: 'destructive',
      });
    },
  });
}

