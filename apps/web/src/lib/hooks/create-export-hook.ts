import { useMutation } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';

import { downloadBlob } from '../utils/download';
import { getApiErrorMessage } from '../utils/query-filters';

/**
 * Factory for creating CSV export mutation hooks.
 * Handles the common pattern of fetching a Blob and downloading it as a .csv file.
 *
 * @param mutationFn - Function that fetches the CSV blob, optionally receiving filter params
 * @param filenamePrefix - Prefix for the downloaded file (date suffix is added automatically)
 * @param errorMessage - User-facing error message shown when export fails
 *
 * @example
 * export const useExportTasks = createExportHook(
 *   (filters?: TaskFiltersDto) => tasksApi.exportCsv(filters),
 *   'zadania',
 *   'Nie udało się wyeksportować zadań'
 * );
 */
export function createExportHook<TFilters = void>(
  mutationFn: (filters?: TFilters) => Promise<Blob>,
  filenamePrefix: string,
  errorMessage = 'Nie udało się wyeksportować danych'
) {
  return function useExportHook() {
    const { toast } = useToast();

    return useMutation({
      mutationFn,
      onSuccess: (blob) => {
        const filename = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
        downloadBlob(blob, filename);
        toast({ title: 'Sukces', description: 'Plik CSV został pobrany' });
      },
      onError: (error: unknown) => {
        toast({
          title: 'Błąd',
          description: getApiErrorMessage(error, errorMessage),
          variant: 'destructive',
        });
      },
    });
  };
}
