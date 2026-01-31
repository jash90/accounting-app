import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';

import {
  settlementsApi,
  type AssignSettlementDto,
  type BulkAssignDto,
  type CreateCommentDto,
  type EmployeeStatsListDto,
  type GetSettlementsQueryDto,
  type InitializeMonthDto,
  type UpdateSettlementDto,
  type UpdateSettlementStatusDto,
} from '../api/endpoints/settlements';
import { queryKeys } from '../api/query-client';

// ============================================
// Settlement List Hooks
// ============================================

export function useSettlements(filters: GetSettlementsQueryDto) {
  return useQuery({
    queryKey: ['settlements', 'list', filters] as const,
    queryFn: () => settlementsApi.getAll(filters),
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: queryKeys.settlements.detail(id),
    queryFn: () => settlementsApi.getById(id),
    enabled: !!id,
  });
}

// ============================================
// Statistics Hooks
// ============================================

export function useSettlementStats(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.overview(month, year),
    queryFn: () => settlementsApi.getOverviewStats(month, year),
    enabled: !!month && !!year,
  });
}

export function useEmployeeStats(
  month: number,
  year: number,
  options?: Partial<UseQueryOptions<EmployeeStatsListDto>>
) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.employees(month, year),
    queryFn: () => settlementsApi.getEmployeeStats(month, year),
    enabled: !!month && !!year && options?.enabled !== false,
    ...options,
  });
}

export function useMyStats(month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.settlements.stats.my(month, year),
    queryFn: () => settlementsApi.getMyStats(month, year),
    enabled: !!month && !!year,
  });
}

// ============================================
// Initialization Hooks
// ============================================

export function useInitializeMonth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: InitializeMonthDto) => settlementsApi.initializeMonth(dto),
    onSuccess: (result, variables) => {
      // Invalidate settlements list and stats for the initialized month
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'], exact: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.stats.overview(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.stats.employees(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.stats.my(variables.month, variables.year),
      });

      toast({
        title: 'Sukces',
        description: `Zainicjalizowano miesiąc: utworzono ${result.created} rozliczeń, pominięto ${result.skipped}`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zainicjalizować miesiąca',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Update Hooks
// ============================================

export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSettlementDto }) =>
      settlementsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'stats'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Rozliczenie zostało zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować rozliczenia',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSettlementStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSettlementStatusDto }) =>
      settlementsApi.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'stats'], exact: false });
      toast({
        title: 'Sukces',
        description: 'Status rozliczenia został zmieniony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zmienić statusu rozliczenia',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Assignment Hooks
// ============================================

export function useAssignSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignSettlementDto }) =>
      settlementsApi.assignToEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'stats'], exact: false });
      toast({
        title: 'Sukces',
        description: variables.data.userId
          ? 'Rozliczenie zostało przypisane'
          : 'Rozliczenie zostało odłączone od pracownika',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przypisać rozliczenia',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkAssignSettlements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkAssignDto) => settlementsApi.bulkAssign(dto),
    onSuccess: (result, variables) => {
      // Invalidate each assigned settlement
      variables.settlementIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.settlements.detail(id) });
      });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['settlements', 'stats'], exact: false });
      toast({
        title: 'Sukces',
        description: `Przypisano ${result.assigned} z ${result.requested} rozliczeń`,
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się przypisać rozliczeń',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Comments Hooks
// ============================================

export function useSettlementComments(settlementId: string) {
  return useQuery({
    queryKey: queryKeys.settlements.comments(settlementId),
    queryFn: () => settlementsApi.getComments(settlementId),
    enabled: !!settlementId,
  });
}

export function useAddSettlementComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ settlementId, data }: { settlementId: string; data: CreateCommentDto }) =>
      settlementsApi.addComment(settlementId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.comments(variables.settlementId),
      });
      toast({
        title: 'Sukces',
        description: 'Komentarz został dodany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się dodać komentarza',
        variant: 'destructive',
      });
    },
  });
}
