import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminContextApi } from '../api/endpoints/admin-context';
import { queryKeys } from '../api/query-client';
import { SwitchContextDto } from '@/types/dtos';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook do pobierania aktualnego kontekstu admina i dostępnych kontekstów
 * Zwraca informację o aktualnej firmie (System Admin lub Firma Testowa)
 * oraz listę firm, do których admin może przełączyć kontekst
 */
export function useAdminContext() {
  return useQuery({
    queryKey: queryKeys.adminContext.current,
    queryFn: adminContextApi.getContext,
    staleTime: 30 * 1000, // 30 sekund - kontekst może się zmieniać
  });
}

/**
 * Hook do przełączania kontekstu admina na inną firmę
 * Po przełączeniu kontekstu wszystkie dane biznesowe będą filtrowane
 * przez wybraną firmę (np. Firma Testowa)
 */
export function useSwitchContext() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: SwitchContextDto) => adminContextApi.switchContext(dto),
    onSuccess: (data) => {
      // Odśwież kontekst admina
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContext.current });

      // Odśwież wszystkie dane biznesowe, które mogą być filtrowane przez firmę
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.context.all });

      const companyName = data.currentContext?.companyName || 'System Admin';
      toast({
        title: 'Kontekst zmieniony',
        description: `Przełączono na: ${companyName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przełączyć kontekstu',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook do resetowania kontekstu admina do domyślnego (System Admin)
 * Używany gdy admin chce wrócić z Firmy Testowej do System Admin
 */
export function useResetContext() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: adminContextApi.resetContext,
    onSuccess: () => {
      // Odśwież kontekst admina
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContext.current });

      // Odśwież wszystkie dane biznesowe
      queryClient.invalidateQueries({ queryKey: queryKeys.simpleText.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.configuration });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiAgent.context.all });

      toast({
        title: 'Kontekst zresetowany',
        description: 'Przełączono na: System Admin',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zresetować kontekstu',
        variant: 'destructive',
      });
    },
  });
}
