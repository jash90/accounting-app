import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

import { zusApi } from '@/lib/api/endpoints/zus';
import type {
  BulkContributionResultDto,
  CalculateEmployeeContributionsDto,
  CalculateZusContributionDto,
  CreateZusContributionDto,
  GenerateMonthlyContributionsDto,
  GenerateMonthlyResultDto,
  MarkPaidDto,
  PaginatedZusContributionsResponseDto,
  UpdateZusContributionDto,
  UpdateZusSettingsDto,
  ZusClientSettingsResponseDto,
  ZusContributionFiltersDto,
  ZusContributionResponseDto,
  ZusMonthlyComparisonDto,
  ZusRatesResponseDto,
  ZusStatisticsDto,
  ZusTopClientDto,
  ZusTotalsDto,
  ZusUpcomingPaymentDto,
} from '@/types/dtos';

// ============================================
// Query Keys
// ============================================

export const zusQueryKeys = {
  all: ['zus'] as const,
  contributions: {
    all: ['zus', 'contributions'] as const,
    list: (filters?: ZusContributionFiltersDto) =>
      ['zus', 'contributions', 'list', filters] as const,
    detail: (id: string) => ['zus', 'contributions', 'detail', id] as const,
    byClient: (clientId: string) => ['zus', 'contributions', 'client', clientId] as const,
  },
  settings: {
    all: ['zus', 'settings'] as const,
    client: (clientId: string) => ['zus', 'settings', 'client', clientId] as const,
    rates: ['zus', 'settings', 'rates'] as const,
  },
  dashboard: {
    all: ['zus', 'dashboard'] as const,
    statistics: ['zus', 'dashboard', 'statistics'] as const,
    upcoming: (days?: number) => ['zus', 'dashboard', 'upcoming', days] as const,
    comparison: (months?: number) => ['zus', 'dashboard', 'comparison', months] as const,
    topClients: (limit?: number) => ['zus', 'dashboard', 'top-clients', limit] as const,
    monthTotals: ['zus', 'dashboard', 'month-totals'] as const,
    yearTotals: ['zus', 'dashboard', 'year-totals'] as const,
  },
};

// ============================================
// Contribution Hooks
// ============================================

/**
 * Hook to fetch ZUS contributions with pagination and filters
 */
export function useZusContributions(
  filters?: ZusContributionFiltersDto,
  options?: Omit<UseQueryOptions<PaginatedZusContributionsResponseDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.contributions.list(filters),
    queryFn: () => zusApi.contributions.getAll(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single ZUS contribution by ID
 */
export function useZusContribution(
  id: string,
  options?: Omit<UseQueryOptions<ZusContributionResponseDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.contributions.detail(id),
    queryFn: () => zusApi.contributions.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to fetch ZUS contributions for a specific client
 */
export function useZusContributionsByClient(
  clientId: string,
  options?: Omit<UseQueryOptions<ZusContributionResponseDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.contributions.byClient(clientId),
    queryFn: () => zusApi.contributions.getByClient(clientId),
    enabled: !!clientId,
    ...options,
  });
}

/**
 * Hook to create a new ZUS contribution
 */
export function useCreateZusContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateZusContributionDto) => zusApi.contributions.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Rozliczenie ZUS zostało utworzone');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas tworzenia rozliczenia: ${error.message}`);
    },
  });
}

/**
 * Hook to calculate ZUS contributions
 */
export function useCalculateZusContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CalculateZusContributionDto) => zusApi.contributions.calculate(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success(`Obliczono składki ZUS: ${data.totalAmountPln} PLN`);
    },
    onError: (error: unknown) => {
      // Check if this is an Axios error with a 409 response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 409) {
          toast.error(
            axiosError.response.data?.message || 'Rozliczenie już istnieje dla tego okresu'
          );
          return;
        }
      }
      toast.error(
        `Błąd podczas obliczania składek: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    },
  });
}

/**
 * Hook to generate monthly contributions for all clients
 */
export function useGenerateMonthlyContributions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GenerateMonthlyContributionsDto) => zusApi.contributions.generateMonthly(dto),
    onSuccess: (data: GenerateMonthlyResultDto) => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success(`Wygenerowano ${data.generated} rozliczeń, pominięto ${data.skipped}`);
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas generowania rozliczeń: ${error.message}`);
    },
  });
}

/**
 * Hook to calculate ZUS contributions for multiple employees
 */
export function useCalculateEmployeeContributions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CalculateEmployeeContributionsDto) =>
      zusApi.contributions.calculateEmployeeContributions(dto),
    onSuccess: (data: BulkContributionResultDto) => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });

      if (data.created > 0) {
        toast.success(
          `Utworzono ${data.created} rozliczeń${data.skipped > 0 ? `, pominięto ${data.skipped} (już istnieją)` : ''}${data.exempt > 0 ? `, ${data.exempt} zwolnionych z ZUS` : ''}`
        );
      } else if (data.skipped > 0) {
        toast.info(`Pominięto ${data.skipped} rozliczeń (już istnieją)`);
      } else if (data.exempt > 0) {
        toast.info(`Wszyscy wybrani pracownicy są zwolnieni z ZUS`);
      }

      if (data.errors > 0) {
        toast.error(`Wystąpiły błędy dla ${data.errors} pracowników`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas obliczania składek: ${error.message}`);
    },
  });
}

/**
 * Hook to update a ZUS contribution
 */
export function useUpdateZusContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateZusContributionDto }) =>
      zusApi.contributions.update(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({
        queryKey: zusQueryKeys.contributions.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Rozliczenie ZUS zostało zaktualizowane');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas aktualizacji: ${error.message}`);
    },
  });
}

/**
 * Hook to mark a ZUS contribution as paid
 */
export function useMarkZusPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: MarkPaidDto }) =>
      zusApi.contributions.markPaid(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({
        queryKey: zusQueryKeys.contributions.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Rozliczenie zostało oznaczone jako opłacone');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas oznaczania jako opłacone: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a ZUS contribution
 */
export function useDeleteZusContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => zusApi.contributions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.contributions.all });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Rozliczenie ZUS zostało usunięte');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas usuwania: ${error.message}`);
    },
  });
}

// ============================================
// Settings Hooks
// ============================================

/**
 * Hook to fetch ZUS settings for a client
 */
export function useZusClientSettings(
  clientId: string,
  options?: Omit<UseQueryOptions<ZusClientSettingsResponseDto | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.settings.client(clientId),
    queryFn: () => zusApi.settings.getForClient(clientId),
    enabled: !!clientId,
    ...options,
  });
}

/**
 * Hook to update ZUS settings for a client
 */
export function useUpdateZusClientSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, dto }: { clientId: string; dto: UpdateZusSettingsDto }) =>
      zusApi.settings.updateForClient(clientId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: zusQueryKeys.settings.client(data.clientId),
      });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Ustawienia ZUS zostały zaktualizowane');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas aktualizacji ustawień: ${error.message}`);
    },
  });
}

/**
 * Hook to delete ZUS settings for a client
 */
export function useDeleteZusClientSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => zusApi.settings.deleteForClient(clientId),
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({
        queryKey: zusQueryKeys.settings.client(clientId),
      });
      queryClient.invalidateQueries({ queryKey: zusQueryKeys.dashboard.all });
      toast.success('Ustawienia ZUS zostały usunięte');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas usuwania ustawień: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch current ZUS rates
 */
export function useZusRates(
  options?: Omit<UseQueryOptions<ZusRatesResponseDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.settings.rates,
    queryFn: () => zusApi.settings.getCurrentRates(),
    staleTime: 1000 * 60 * 60, // 1 hour - rates don't change often
    ...options,
  });
}

// ============================================
// Dashboard Hooks
// ============================================

/**
 * Hook to fetch ZUS dashboard statistics
 */
export function useZusStatistics(
  options?: Omit<UseQueryOptions<ZusStatisticsDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.statistics,
    queryFn: () => zusApi.dashboard.getStatistics(),
    ...options,
  });
}

/**
 * Hook to fetch upcoming ZUS payments
 */
export function useZusUpcomingPayments(
  days: number = 30,
  options?: Omit<UseQueryOptions<ZusUpcomingPaymentDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.upcoming(days),
    queryFn: () => zusApi.dashboard.getUpcoming(days),
    ...options,
  });
}

/**
 * Hook to fetch monthly ZUS comparison
 */
export function useZusMonthlyComparison(
  months: number = 6,
  options?: Omit<UseQueryOptions<ZusMonthlyComparisonDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.comparison(months),
    queryFn: () => zusApi.dashboard.getComparison(months),
    ...options,
  });
}

/**
 * Hook to fetch top clients by ZUS contributions
 */
export function useZusTopClients(
  limit: number = 10,
  options?: Omit<UseQueryOptions<ZusTopClientDto[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.topClients(limit),
    queryFn: () => zusApi.dashboard.getTopClients(limit),
    ...options,
  });
}

/**
 * Hook to fetch current month ZUS totals
 */
export function useZusMonthTotals(
  options?: Omit<UseQueryOptions<ZusTotalsDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.monthTotals,
    queryFn: () => zusApi.dashboard.getMonthTotals(),
    ...options,
  });
}

/**
 * Hook to fetch current year ZUS totals
 */
export function useZusYearTotals(
  options?: Omit<UseQueryOptions<ZusTotalsDto>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: zusQueryKeys.dashboard.yearTotals,
    queryFn: () => zusApi.dashboard.getYearTotals(),
    ...options,
  });
}

// ============================================
// Export Hooks
// ============================================

/**
 * Hook to export ZUS contributions to CSV
 */
export function useExportZusContributions() {
  return useMutation({
    mutationFn: (filters?: ZusContributionFiltersDto) => zusApi.contributions.exportCsv(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zus-contributions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Eksport zakończony pomyślnie');
    },
    onError: (error: Error) => {
      toast.error(`Błąd podczas eksportu: ${error.message}`);
    },
  });
}
