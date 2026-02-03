import { type ApiErrorResponse } from '@/types/api';
import {
  type ClientFiltersDto,
  type CreateClientDto,
  type CreateClientFieldDefinitionDto,
  type CreateClientIconDto,
  type CreateNotificationSettingsDto,
  type SetCustomFieldValuesDto,
  type UpdateClientDto,
  type UpdateClientFieldDefinitionDto,
  type UpdateClientIconDto,
  type UpdateNotificationSettingsDto,
} from '@/types/dtos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  clientIconsApi,
  clientsApi,
  fieldDefinitionsApi,
  notificationSettingsApi,
  type BulkDeleteClientsDto,
  type BulkEditClientsDto,
  type BulkRestoreClientsDto,
  type CheckDuplicatesDto,
  type FieldDefinitionQueryDto,
  type IconQueryDto,
} from '../api/endpoints/clients';
import { queryKeys } from '../api/query-client';

// ============================================
// Client Hooks
// ============================================

export function useClients(filters?: ClientFiltersDto) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => clientsApi.getAll(filters),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (clientData: CreateClientDto) => clientsApi.create(clientData),
    onSuccess: () => {
      // Invalidate list views and statistics
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });
      toast({
        title: 'Sukces',
        description: 'Klient został utworzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć klienta',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific client and list views
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Klient został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować klienta',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate list views
      queryClient.removeQueries({ queryKey: queryKeys.clients.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });
      toast({
        title: 'Sukces',
        description: 'Klient został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć klienta',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => clientsApi.restore(id),
    onSuccess: (_, restoredId) => {
      // Invalidate restored client and list views
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(restoredId) });
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });
      toast({
        title: 'Sukces',
        description: 'Klient został przywrócony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przywrócić klienta',
        variant: 'destructive',
      });
    },
  });
}

export function useAssignClientIcon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, iconId }: { clientId: string; iconId: string }) =>
      clientIconsApi.assignIcon(clientId, iconId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.all });
      toast({
        title: 'Sukces',
        description: 'Ikona została przypisana do klienta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przypisać ikony',
        variant: 'destructive',
      });
    },
  });
}

export function useUnassignClientIcon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, iconId }: { clientId: string; iconId: string }) =>
      clientIconsApi.unassignIcon(clientId, iconId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.all });
      toast({
        title: 'Sukces',
        description: 'Ikona została odłączona od klienta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się odłączyć ikony',
        variant: 'destructive',
      });
    },
  });
}

export function useIconsForClient(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clientIcons.byClient(clientId),
    queryFn: () => clientIconsApi.getClientIcons(clientId),
    enabled: !!clientId,
  });
}

export function useSetClientCustomFields() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetCustomFieldValuesDto }) =>
      clientsApi.setCustomFieldValues(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Pola niestandardowe zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować pól',
        variant: 'destructive',
      });
    },
  });
}

export function useClientChangelog(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.changelog(clientId),
    queryFn: () => clientsApi.getChangelog(clientId),
    enabled: !!clientId,
  });
}

// ============================================
// Statistics Hook
// ============================================

export function useClientStatistics() {
  return useQuery({
    queryKey: queryKeys.clients.statistics,
    queryFn: () => clientsApi.getStatistics(),
  });
}

// ============================================
// Duplicate Detection Hook
// ============================================

export function useCheckDuplicates() {
  return useMutation({
    mutationFn: (dto: CheckDuplicatesDto) => clientsApi.checkDuplicates(dto),
  });
}

// ============================================
// Bulk Operations Hooks
// ============================================

export function useBulkDeleteClients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkDeleteClientsDto) => clientsApi.bulkDelete(dto),
    onSuccess: (result, variables) => {
      // Remove deleted clients from cache
      variables.clientIds.forEach((id: string) => {
        queryClient.removeQueries({ queryKey: queryKeys.clients.detail(id) });
      });
      // Invalidate list views and statistics
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });
      toast({
        title: 'Sukces',
        description: `Usunięto ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć klientów',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkRestoreClients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkRestoreClientsDto) => clientsApi.bulkRestore(dto),
    onSuccess: (result, variables) => {
      // Invalidate restored clients
      variables.clientIds.forEach((id: string) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(id) });
      });
      // Invalidate list views and statistics
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });
      toast({
        title: 'Sukces',
        description: `Przywrócono ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przywrócić klientów',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkEditClients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkEditClientsDto) => clientsApi.bulkEdit(dto),
    onSuccess: (result, variables) => {
      // Invalidate edited clients
      variables.clientIds.forEach((id: string) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(id) });
      });
      // Invalidate list views
      queryClient.invalidateQueries({ queryKey: ['clients', 'list'], exact: false });
      toast({
        title: 'Sukces',
        description: `Zaktualizowano ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować klientów',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Export/Import Hooks
// ============================================

export function useExportClients() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (filters?: ClientFiltersDto) => clientsApi.exportCsv(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `klienci-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sukces',
        description: 'Plik CSV został pobrany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wyeksportować danych',
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadImportTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => clientsApi.getImportTemplate(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'szablon-importu-klientow.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sukces',
        description: 'Szablon CSV został pobrany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się pobrać szablonu',
        variant: 'destructive',
      });
    },
  });
}

export function useImportClients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => clientsApi.importCsv(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.statistics });

      const hasErrors = result.errors.length > 0;
      toast({
        title: hasErrors ? 'Import zakończony z błędami' : 'Sukces',
        description: `Zaimportowano: ${result.imported}, zaktualizowano: ${result.updated}${hasErrors ? `, błędów: ${result.errors.length}` : ''}`,
        variant: hasErrors ? 'default' : 'default',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaimportować danych',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Field Definition Hooks
// ============================================

export function useFieldDefinitions(query?: FieldDefinitionQueryDto) {
  return useQuery({
    queryKey: [...queryKeys.clientFieldDefinitions.all, query],
    queryFn: () => fieldDefinitionsApi.getAll(query),
  });
}

export function useFieldDefinition(id: string) {
  return useQuery({
    queryKey: queryKeys.clientFieldDefinitions.detail(id),
    queryFn: () => fieldDefinitionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateFieldDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (fieldData: CreateClientFieldDefinitionDto) =>
      fieldDefinitionsApi.create(fieldData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFieldDefinitions.all });
      toast({
        title: 'Sukces',
        description: 'Definicja pola została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć definicji pola',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFieldDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientFieldDefinitionDto }) =>
      fieldDefinitionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFieldDefinitions.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clientFieldDefinitions.detail(variables.id),
      });
      toast({
        title: 'Sukces',
        description: 'Definicja pola została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować definicji pola',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteFieldDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => fieldDefinitionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFieldDefinitions.all });
      toast({
        title: 'Sukces',
        description: 'Definicja pola została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć definicji pola',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderFieldDefinitions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (orderedIds: string[]) => fieldDefinitionsApi.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFieldDefinitions.all });
      toast({
        title: 'Sukces',
        description: 'Kolejność pól została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zmienić kolejności pól',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Client Icon Hooks
// ============================================

export function useClientIcons(query?: IconQueryDto) {
  return useQuery({
    queryKey: [...queryKeys.clientIcons.all, query],
    queryFn: () => clientIconsApi.getAll(query),
  });
}

export function useClientIcon(id: string) {
  return useQuery({
    queryKey: queryKeys.clientIcons.detail(id),
    queryFn: () => clientIconsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateClientIcon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ iconData, file }: { iconData: CreateClientIconDto; file?: File }) =>
      clientIconsApi.create(iconData, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.all });
      toast({
        title: 'Sukces',
        description: 'Ikona została utworzona',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć ikony',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClientIcon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientIconDto }) =>
      clientIconsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.detail(variables.id) });
      toast({
        title: 'Sukces',
        description: 'Ikona została zaktualizowana',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować ikony',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientIcon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => clientIconsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientIcons.all });
      toast({
        title: 'Sukces',
        description: 'Ikona została usunięta',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć ikony',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Notification Settings Hooks
// ============================================

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings.me,
    queryFn: notificationSettingsApi.getMe,
  });
}

export function useCreateNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settingsData: CreateNotificationSettingsDto) =>
      notificationSettingsApi.create(settingsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings.me });
      toast({
        title: 'Sukces',
        description: 'Ustawienia powiadomień zostały utworzone',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć ustawień powiadomień',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settingsData: UpdateNotificationSettingsDto) =>
      notificationSettingsApi.update(settingsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings.me });
      toast({
        title: 'Sukces',
        description: 'Ustawienia powiadomień zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description:
          error.response?.data?.message || 'Nie udało się zaktualizować ustawień powiadomień',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificationSettingsApi.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings.me });
      toast({
        title: 'Sukces',
        description: 'Ustawienia powiadomień zostały usunięte',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć ustawień powiadomień',
        variant: 'destructive',
      });
    },
  });
}
