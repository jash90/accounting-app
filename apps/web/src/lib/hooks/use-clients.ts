import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import {
  type ClientFiltersDto,
  type ClientResponseDto,
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


import { createExportHook } from './create-export-hook';
import { createMutationHook } from './create-mutation-hook';
import {
  clientIconsApi,
  clientsApi,
  fieldDefinitionsApi,
  notificationSettingsApi,
  type BulkDeleteClientsDto,
  type BulkEditClientsDto,
  type BulkRestoreClientsDto,
  type CheckDuplicatesDto,
  type ClientTaskTimeStatsDto,
  type FieldDefinitionQueryDto,
  type IconQueryDto,
} from '../api/endpoints/clients';
import { queryKeys } from '../api/query-client';
import { downloadBlob } from '../utils/download';
import { buildQueryFilters, getApiErrorMessage } from '../utils/query-filters';

// ============================================
// Cache Time Constants
// ============================================

/** Cache times for client list views - data may change frequently */
const CLIENT_LIST_CACHE = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for client detail views - slightly longer */
const CLIENT_DETAIL_CACHE = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
};

/** Cache times for lookup/metadata - changes infrequently */
const CLIENT_LOOKUP_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
};

// ============================================
// Helper Functions
// ============================================

/**
 * Predicate to invalidate client list queries only, not individual detail queries.
 * This prevents unnecessary refetches of client details that haven't changed.
 */
const isClientListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  // Match list queries: ['clients', 'list', ...] but not detail queries: ['clients', 'detail', id]
  return Array.isArray(key) && key[0] === 'clients' && key[1] !== 'detail';
};

// ============================================
// Client Hooks
// ============================================

export function useClients(filters?: ClientFiltersDto) {
  return useQuery({
    queryKey: queryKeys.clients.list(buildQueryFilters(filters)),
    queryFn: () => clientsApi.getAll(filters),
    ...CLIENT_LIST_CACHE,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
    ...CLIENT_DETAIL_CACHE,
  });
}

export const useCreateClient = createMutationHook<ClientResponseDto, CreateClientDto>({
  mutationFn: (clientData) => clientsApi.create(clientData),
  invalidatePredicate: isClientListQuery,
  successMessage: 'Klient został utworzony',
  errorMessage: 'Nie udało się utworzyć klienta',
});

export const useUpdateClient = createMutationHook<void, { id: string; data: UpdateClientDto }>({
  mutationFn: ({ id, data }) => clientsApi.update(id, data),
  invalidatePredicate: isClientListQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
  },
  successMessage: 'Klient został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować klienta',
});

export const useDeleteClient = createMutationHook<void, string>({
  mutationFn: (id) => clientsApi.delete(id),
  invalidatePredicate: isClientListQuery,
  onSuccess: (_, deletedId, qc) => {
    qc.removeQueries({ queryKey: queryKeys.clients.detail(deletedId) });
  },
  successMessage: 'Klient został usunięty',
  errorMessage: 'Nie udało się usunąć klienta',
});

export const useRestoreClient = createMutationHook<void, string>({
  mutationFn: (id) => clientsApi.restore(id),
  invalidatePredicate: isClientListQuery,
  onSuccess: (_, restoredId, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(restoredId) });
  },
  successMessage: 'Klient został przywrócony',
  errorMessage: 'Nie udało się przywrócić klienta',
});

export const useAssignClientIcon = createMutationHook<
  void,
  { clientId: string; iconId: string }
>({
  mutationFn: ({ clientId, iconId }) => clientIconsApi.assignIcon(clientId, iconId),
  invalidatePredicate: isClientListQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
    qc.invalidateQueries({ queryKey: queryKeys.clientIcons.byClient(variables.clientId) });
  },
  successMessage: 'Ikona została przypisana do klienta',
  errorMessage: 'Nie udało się przypisać ikony',
});

export const useUnassignClientIcon = createMutationHook<
  void,
  { clientId: string; iconId: string }
>({
  mutationFn: ({ clientId, iconId }) => clientIconsApi.unassignIcon(clientId, iconId),
  invalidatePredicate: isClientListQuery,
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
    qc.invalidateQueries({ queryKey: queryKeys.clientIcons.byClient(variables.clientId) });
  },
  successMessage: 'Ikona została odłączona od klienta',
  errorMessage: 'Nie udało się odłączyć ikony',
});

export function useIconsForClient(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clientIcons.byClient(clientId),
    queryFn: () => clientIconsApi.getClientIcons(clientId),
    enabled: !!clientId,
    ...CLIENT_DETAIL_CACHE,
  });
}

export const useSetClientCustomFields = createMutationHook<
  void,
  { id: string; data: SetCustomFieldValuesDto }
>({
  mutationFn: ({ id, data }) => clientsApi.setCustomFieldValues(id, data),
  onSuccess: (_, variables, qc) => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
  },
  successMessage: 'Pola niestandardowe zostały zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować pól',
});

export function useClientChangelog(clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.changelog(clientId),
    queryFn: () => clientsApi.getChangelog(clientId),
    enabled: !!clientId,
    ...CLIENT_DETAIL_CACHE,
  });
}

// ============================================
// Statistics Hook
// ============================================

export function useClientStatistics() {
  return useQuery({
    queryKey: queryKeys.clients.statistics,
    queryFn: () => clientsApi.getStatistics(),
    ...CLIENT_LOOKUP_CACHE,
  });
}

export function useClientTaskTimeStats() {
  return useQuery<ClientTaskTimeStatsDto[]>({
    queryKey: queryKeys.clients.taskTimeStats,
    queryFn: () => clientsApi.getClientTaskTimeStats(),
    ...CLIENT_LOOKUP_CACHE,
  });
}

// ============================================
// Duplicate Detection Hook
// ============================================

export function useCheckClientDuplicates() {
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
      // Remove deleted clients from cache using batch predicate (O(1) vs O(n) individual calls)
      const idsToRemove = new Set(variables.clientIds);
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'clients' &&
            typeof key[1] === 'string' &&
            key[1] !== 'list' &&
            key[1] !== 'statistics' &&
            idsToRemove.has(key[1])
          );
        },
      });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isClientListQuery });
      toast({
        title: 'Sukces',
        description: `Usunięto ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się usunąć klientów'),
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
      // Invalidate restored client details using batch predicate (O(1) vs O(n) individual calls)
      const idsToInvalidate = new Set(variables.clientIds);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'clients' &&
            key[1] === 'detail' &&
            typeof key[2] === 'string' &&
            idsToInvalidate.has(key[2])
          );
        },
      });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isClientListQuery });
      toast({
        title: 'Sukces',
        description: `Przywrócono ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się przywrócić klientów'),
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
      // Invalidate edited client details using batch predicate (O(1) vs O(n) individual calls)
      const idsToInvalidate = new Set(variables.clientIds);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'clients' &&
            key[1] === 'detail' &&
            typeof key[2] === 'string' &&
            idsToInvalidate.has(key[2])
          );
        },
      });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isClientListQuery });
      toast({
        title: 'Sukces',
        description: `Zaktualizowano ${result.affected} klientów`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się zaktualizować klientów'),
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Export/Import Hooks
// ============================================

export const useExportClients = createExportHook<ClientFiltersDto>(
  (filters) => clientsApi.exportCsv(filters),
  'klienci',
  'Nie udało się wyeksportować danych'
);

export function useDownloadClientImportTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => clientsApi.getImportTemplate(),
    onSuccess: (blob) => {
      downloadBlob(blob, 'szablon-importu-klientow.csv');

      toast({
        title: 'Sukces',
        description: 'Szablon CSV został pobrany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się pobrać szablonu'),
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
      // Only invalidate list queries - imported/updated clients will be fetched fresh
      queryClient.invalidateQueries({ predicate: isClientListQuery });

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
        description: getApiErrorMessage(error, 'Nie udało się zaimportować danych'),
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Field Definition Hooks
// ============================================

export function useClientFieldDefinitions(query?: FieldDefinitionQueryDto) {
  return useQuery({
    queryKey: queryKeys.clientFieldDefinitions.list(query),
    queryFn: () => fieldDefinitionsApi.getAll(query),
    ...CLIENT_LOOKUP_CACHE,
  });
}

export function useClientFieldDefinition(id: string) {
  return useQuery({
    queryKey: queryKeys.clientFieldDefinitions.detail(id),
    queryFn: () => fieldDefinitionsApi.getById(id),
    enabled: !!id,
    ...CLIENT_LOOKUP_CACHE,
  });
}

export const useCreateClientFieldDefinition = createMutationHook<
  void,
  CreateClientFieldDefinitionDto
>({
  mutationFn: (fieldData) => fieldDefinitionsApi.create(fieldData),
  invalidateKeys: [queryKeys.clientFieldDefinitions.all],
  successMessage: 'Definicja pola została utworzona',
  errorMessage: 'Nie udało się utworzyć definicji pola',
});

export const useUpdateClientFieldDefinition = createMutationHook<
  void,
  { id: string; data: UpdateClientFieldDefinitionDto }
>({
  mutationFn: ({ id, data }) => fieldDefinitionsApi.update(id, data),
  invalidateKeys: [queryKeys.clientFieldDefinitions.all],
  successMessage: 'Definicja pola została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować definicji pola',
});

export const useDeleteClientFieldDefinition = createMutationHook<void, string>({
  mutationFn: (id) => fieldDefinitionsApi.delete(id),
  invalidateKeys: [queryKeys.clientFieldDefinitions.all],
  successMessage: 'Definicja pola została usunięta',
  errorMessage: 'Nie udało się usunąć definicji pola',
});

export const useReorderClientFieldDefinitions = createMutationHook<void, string[]>({
  mutationFn: (orderedIds) => fieldDefinitionsApi.reorder(orderedIds),
  invalidateKeys: [queryKeys.clientFieldDefinitions.all],
  successMessage: 'Kolejność pól została zaktualizowana',
  errorMessage: 'Nie udało się zmienić kolejności pól',
});

// ============================================
// Client Icon Hooks
// ============================================

export function useClientIcons(query?: IconQueryDto) {
  return useQuery({
    queryKey: queryKeys.clientIcons.list(query),
    queryFn: () => clientIconsApi.getAll(query),
    ...CLIENT_LOOKUP_CACHE,
  });
}

export function useClientIcon(id: string) {
  return useQuery({
    queryKey: queryKeys.clientIcons.detail(id),
    queryFn: () => clientIconsApi.getById(id),
    enabled: !!id,
    ...CLIENT_LOOKUP_CACHE,
  });
}

export const useCreateClientIcon = createMutationHook<
  void,
  { iconData: CreateClientIconDto; file?: File }
>({
  mutationFn: ({ iconData, file }) => clientIconsApi.create(iconData, file),
  invalidateKeys: [queryKeys.clientIcons.all],
  successMessage: 'Ikona została utworzona',
  errorMessage: 'Nie udało się utworzyć ikony',
});

export const useUpdateClientIcon = createMutationHook<
  void,
  { id: string; data: UpdateClientIconDto }
>({
  mutationFn: ({ id, data }) => clientIconsApi.update(id, data),
  invalidateKeys: [queryKeys.clientIcons.all],
  successMessage: 'Ikona została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować ikony',
});

export const useDeleteClientIcon = createMutationHook<void, string>({
  mutationFn: (id) => clientIconsApi.delete(id),
  invalidateKeys: [queryKeys.clientIcons.all],
  successMessage: 'Ikona została usunięta',
  errorMessage: 'Nie udało się usunąć ikony',
});

// ============================================
// Notification Settings Hooks
// ============================================

export function useClientNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings.me,
    queryFn: notificationSettingsApi.getMe,
    ...CLIENT_LOOKUP_CACHE,
  });
}

export const useCreateNotificationSettings = createMutationHook<
  void,
  CreateNotificationSettingsDto
>({
  mutationFn: (settingsData) => notificationSettingsApi.create(settingsData),
  invalidateKeys: [queryKeys.notificationSettings.me],
  successMessage: 'Ustawienia powiadomień zostały utworzone',
  errorMessage: 'Nie udało się utworzyć ustawień powiadomień',
});

export const useUpdateNotificationSettings = createMutationHook<
  void,
  UpdateNotificationSettingsDto
>({
  mutationFn: (settingsData) => notificationSettingsApi.update(settingsData),
  invalidateKeys: [queryKeys.notificationSettings.me],
  successMessage: 'Ustawienia powiadomień zostały zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować ustawień powiadomień',
});

export const useDeleteNotificationSettings = createMutationHook({
  mutationFn: () => notificationSettingsApi.delete(),
  invalidateKeys: [queryKeys.notificationSettings.me],
  successMessage: 'Ustawienia powiadomień zostały usunięte',
  errorMessage: 'Nie udało się usunąć ustawień powiadomień',
});
