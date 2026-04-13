import { useQuery } from '@tanstack/react-query';

import { createMutationHook } from './create-mutation-hook';
import {
  ksefApi,
  type CreateKsefInvoice,
  type KsefAuditLogFilters,
  type KsefInvoiceFilters,
  type KsefInvoiceResponse,
  type KsefSyncRequest,
  type UpsertKsefConfig,
  type UpdateKsefInvoice,
} from '../api/endpoints/ksef';
import { queryKeys } from '../api/query-client';

// ============================================
// Configuration Hooks
// ============================================

export function useKsefConfig() {
  return useQuery({
    queryKey: queryKeys.ksef.config,
    queryFn: () => ksefApi.getConfig(),
  });
}

export const useUpdateKsefConfig = createMutationHook<unknown, UpsertKsefConfig>({
  mutationFn: (data) => ksefApi.updateConfig(data),
  invalidateKeys: [queryKeys.ksef.config],
  successMessage: 'Konfiguracja KSeF została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować konfiguracji KSeF',
});

export const useTestKsefConnection = createMutationHook({
  mutationFn: () => ksefApi.testConnection(),
  errorMessage: 'Nie udało się przetestować połączenia z KSeF',
});

// ============================================
// Invoice Query Hooks
// ============================================

export function useKsefInvoices(filters?: KsefInvoiceFilters) {
  return useQuery({
    queryKey: queryKeys.ksef.invoices.list(filters),
    queryFn: () => ksefApi.getInvoices(filters),
    staleTime: 30 * 1000,
  });
}

export function useKsefInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.ksef.invoices.detail(id),
    queryFn: () => ksefApi.getInvoice(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ============================================
// Invoice Mutation Hooks
// ============================================

export const useCreateKsefInvoice = createMutationHook<unknown, CreateKsefInvoice>({
  mutationFn: (data) => ksefApi.createInvoice(data),
  invalidateKeys: [queryKeys.ksef.invoices.all, queryKeys.ksef.stats.dashboard],
  successMessage: 'Faktura została utworzona',
  errorMessage: 'Nie udało się utworzyć faktury',
});

export const useUpdateKsefInvoice = createMutationHook<
  unknown,
  { id: string; data: UpdateKsefInvoice }
>({
  mutationFn: ({ id, data }) => ksefApi.updateInvoice(id, data),
  invalidateKeys: [queryKeys.ksef.invoices.all],
  onSuccess: (_data, variables, queryClient) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.ksef.invoices.detail(variables.id),
    });
  },
  successMessage: 'Faktura została zaktualizowana',
  errorMessage: 'Nie udało się zaktualizować faktury',
});

export const useDeleteKsefInvoice = createMutationHook<void, string>({
  mutationFn: (id) => ksefApi.deleteInvoice(id),
  invalidateKeys: [queryKeys.ksef.invoices.all, queryKeys.ksef.stats.dashboard],
  successMessage: 'Faktura została usunięta',
  errorMessage: 'Nie udało się usunąć faktury',
});

export const useSubmitKsefInvoice = createMutationHook<unknown, string>({
  mutationFn: (id) => ksefApi.submitInvoice(id),
  invalidateKeys: [
    queryKeys.ksef.invoices.all,
    queryKeys.ksef.sessions.all,
    queryKeys.ksef.stats.dashboard,
  ],
  successMessage: 'Faktura wysłana do KSeF — oczekiwanie na potwierdzenie',
  errorMessage: 'Nie udało się wysłać faktury do KSeF',
});

export const useBatchSubmitKsefInvoices = createMutationHook<unknown, string[]>({
  mutationFn: (ids) => ksefApi.batchSubmit(ids),
  invalidateKeys: [
    queryKeys.ksef.invoices.all,
    queryKeys.ksef.sessions.all,
    queryKeys.ksef.stats.dashboard,
  ],
  successMessage: 'Faktury zostały wysłane do KSeF',
  errorMessage: 'Nie udało się wysłać faktur do KSeF',
});

export const useGenerateKsefXml = createMutationHook<{ xml: string; hash: string }, string>({
  mutationFn: (id) => ksefApi.generateXml(id),
  errorMessage: 'Nie udało się wygenerować XML',
});

export const useCheckKsefInvoiceStatus = createMutationHook<KsefInvoiceResponse, string>({
  mutationFn: (id) => ksefApi.getInvoiceStatus(id),
  invalidateKeys: [queryKeys.ksef.invoices.all],
  successMessage: 'Status faktury zaktualizowany',
  errorMessage: 'Nie udało się sprawdzić statusu faktury',
});

// ============================================
// Session Hooks
// ============================================

export function useKsefActiveSession() {
  return useQuery({
    queryKey: queryKeys.ksef.sessions.active,
    queryFn: () => ksefApi.getActiveSession(),
    staleTime: 30 * 1000,
  });
}

export const useOpenKsefSession = createMutationHook({
  mutationFn: () => ksefApi.openSession(),
  invalidateKeys: [queryKeys.ksef.sessions.all, queryKeys.ksef.sessions.active],
  successMessage: 'Sesja KSeF została otwarta',
  errorMessage: 'Nie udało się otworzyć sesji KSeF',
});

export function useKsefSessions(filters?: { page?: number; limit?: number; sessionType?: string }) {
  return useQuery({
    queryKey: queryKeys.ksef.sessions.list(filters),
    queryFn: () => ksefApi.getSessions(filters),
    staleTime: 30_000,
  });
}

export const useCloseKsefSession = createMutationHook<unknown, string>({
  mutationFn: (id) => ksefApi.closeSession(id),
  invalidateKeys: [queryKeys.ksef.sessions.all, queryKeys.ksef.sessions.active],
  successMessage: 'Sesja KSeF została zamknięta',
  errorMessage: 'Nie udało się zamknąć sesji KSeF',
});

// ============================================
// Sync Hooks
// ============================================

export const useSyncKsefInvoices = createMutationHook<unknown, KsefSyncRequest>({
  mutationFn: (data) => ksefApi.syncInvoices(data),
  invalidateKeys: [queryKeys.ksef.invoices.all, queryKeys.ksef.stats.dashboard],
  successMessage: 'Synchronizacja faktur zakończona',
  errorMessage: 'Nie udało się zsynchronizować faktur',
});

// ============================================
// Dashboard Stats Hook
// ============================================

export function useKsefDashboardStats() {
  return useQuery({
    queryKey: queryKeys.ksef.stats.dashboard,
    queryFn: () => ksefApi.getDashboardStats(),
    staleTime: 60 * 1000,
  });
}

// ============================================
// Health Hook
// ============================================

export function useKsefHealth() {
  return useQuery({
    queryKey: queryKeys.ksef.stats.health,
    queryFn: () => ksefApi.checkHealth(),
    staleTime: 10_000,
  });
}

// ============================================
// Audit Hooks
// ============================================

export function useKsefAuditLogs(filters?: KsefAuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.ksef.audit.list(filters),
    queryFn: () => ksefApi.getAuditLogs(filters),
    staleTime: 30 * 1000,
  });
}
