import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companySettingsApi, UpdateCompanySettingsDto } from '../api/endpoints/company-settings';
import { queryKeys } from '../api/query-client';
import { useToast } from '@/components/ui/use-toast';

export function useCompanySettings() {
  return useQuery({
    queryKey: queryKeys.companySettings.me,
    queryFn: companySettingsApi.get,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateCompanySettingsDto) => companySettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companySettings.me });
      toast({
        title: 'Sukces',
        description: 'Ustawienia firmy zostały zaktualizowane',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Nie udało się zaktualizować ustawień';
      toast({
        title: 'Błąd',
        description: message,
        variant: 'destructive',
      });
    },
  });
}
