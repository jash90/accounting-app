import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { type ApiErrorResponse } from '@/types/api';
import {
  type CreateTimeEntryDto,
  type RejectTimeEntryDto,
  type StartTimerDto,
  type StopTimerDto,
  type TimeEntryFiltersDto,
  type UpdateTimeEntryDto,
  type UpdateTimerDto,
  type UpdateTimeSettingsDto,
} from '@/types/dtos';


import { createMutationHook } from './create-mutation-hook';
import {
  timeEntriesApi,
  timerApi,
  timeReportsApi,
  timeSettingsApi,
  timesheetApi,
} from '../api/endpoints/time-tracking';
import { queryKeys } from '../api/query-client';
import { downloadBlob } from '../utils/download';
import { getApiErrorMessage } from '../utils/query-filters';
import { createListPredicate } from '../utils/query-predicates';

// ============================================
// Helper Functions
// ============================================

const isTimeEntryListQuery = createListPredicate('time-entries');

// Named constants for timer intervals and timeouts
// Sync timer state with server periodically to keep elapsed time accurate on multiple devices/tabs
const TIMER_REFETCH_INTERVAL_MS = 10000; // 10 seconds

// ============================================
// Cache Time Constants
// ============================================

/** Cache times for time entry list views - data is time-sensitive */
const TIME_ENTRY_LIST_CACHE = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for time entry detail views */
const TIME_ENTRY_DETAIL_CACHE = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for time settings - changes infrequently */
const TIME_SETTINGS_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
};

/** Cache times for timesheet views */
const TIMESHEET_CACHE = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
};

/** Cache times for report data */
const REPORT_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
};

// ============================================
// Time Entry Hooks
// ============================================

export function useTimeEntries(filters?: TimeEntryFiltersDto) {
  return useQuery({
    queryKey: queryKeys.timeTracking.entries.list(filters),
    queryFn: () => timeEntriesApi.getAll(filters),
    ...TIME_ENTRY_LIST_CACHE,
  });
}

export function useTimeEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.timeTracking.entries.detail(id),
    queryFn: () => timeEntriesApi.getById(id),
    enabled: !!id,
    ...TIME_ENTRY_DETAIL_CACHE,
  });
}

export const useCreateTimeEntry = createMutationHook<unknown, CreateTimeEntryDto>({
  mutationFn: (entryData) => timeEntriesApi.create(entryData),
  invalidatePredicate: isTimeEntryListQuery,
  successMessage: 'Wpis czasu został utworzony',
  errorMessage: 'Nie udało się utworzyć wpisu czasu',
});

export const useUpdateTimeEntry = createMutationHook<
  unknown,
  { id: string; data: UpdateTimeEntryDto }
>({
  mutationFn: ({ id, data }) => timeEntriesApi.update(id, data),
  invalidatePredicate: isTimeEntryListQuery,
  onSuccess: (_, vars, qc) => {
    // Invalidate the specific detail query
    qc.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(vars.id) });
  },
  successMessage: 'Wpis czasu został zaktualizowany',
  errorMessage: 'Nie udało się zaktualizować wpisu czasu',
});

export const useDeleteTimeEntry = createMutationHook<unknown, string>({
  mutationFn: (id) => timeEntriesApi.delete(id),
  invalidatePredicate: isTimeEntryListQuery,
  onSuccess: (_, deletedId, qc) => {
    // Remove the specific detail query from cache
    qc.removeQueries({ queryKey: queryKeys.timeTracking.entries.detail(deletedId) });
  },
  successMessage: 'Wpis czasu został usunięty',
  errorMessage: 'Nie udało się usunąć wpisu czasu',
});

// ============================================
// Approval Workflow Hooks
// ============================================

export const useSubmitTimeEntry = createMutationHook<unknown, string>({
  mutationFn: (id) => timeEntriesApi.submit(id),
  invalidatePredicate: isTimeEntryListQuery,
  onSuccess: (_, id, qc) => {
    // Invalidate the specific detail query
    qc.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
  },
  successMessage: 'Wpis czasu został wysłany do zatwierdzenia',
  errorMessage: 'Nie udało się wysłać wpisu do zatwierdzenia',
});

export const useApproveTimeEntry = createMutationHook<unknown, string>({
  mutationFn: (id) => timeEntriesApi.approve(id),
  invalidatePredicate: isTimeEntryListQuery,
  onSuccess: (_, id, qc) => {
    // Invalidate the specific detail query
    qc.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
  },
  successMessage: 'Wpis czasu został zatwierdzony',
  errorMessage: 'Nie udało się zatwierdzić wpisu czasu',
});

export const useRejectTimeEntry = createMutationHook<
  unknown,
  { id: string; data: RejectTimeEntryDto }
>({
  mutationFn: ({ id, data }) => timeEntriesApi.reject(id, data),
  invalidatePredicate: isTimeEntryListQuery,
  onSuccess: (_, vars, qc) => {
    // Invalidate the specific detail query
    qc.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(vars.id) });
  },
  successMessage: 'Wpis czasu został odrzucony',
  errorMessage: 'Nie udało się odrzucić wpisu czasu',
});

// ============================================
// Timer Hooks
// ============================================

export function useActiveTimer() {
  return useQuery({
    queryKey: queryKeys.timeTracking.timer.active,
    queryFn: () => timerApi.getActive(),
    refetchInterval: TIMER_REFETCH_INTERVAL_MS, // Sync timer state with server for cross-device/tab consistency
    refetchIntervalInBackground: false, // Don't poll when tab is not visible to save resources
  });
}

export const useStartTimer = createMutationHook<unknown, StartTimerDto>({
  mutationFn: (dto) => timerApi.start(dto),
  invalidateKeys: [queryKeys.timeTracking.timer.active],
  invalidatePredicate: isTimeEntryListQuery,
  successMessage: 'Timer został uruchomiony',
  errorMessage: 'Nie udało się uruchomić timera',
});

export const useStopTimer = createMutationHook<unknown, StopTimerDto | undefined>({
  mutationFn: (dto) => timerApi.stop(dto),
  invalidateKeys: [queryKeys.timeTracking.timer.active],
  invalidatePredicate: isTimeEntryListQuery,
  successMessage: 'Timer został zatrzymany, wpis czasu zapisany',
  errorMessage: 'Nie udało się zatrzymać timera',
});

export function useUpdateTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: UpdateTimerDto) => timerApi.update(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.timer.active });
    },
    onError: () => {
      toast({
        title: 'Ostrzeżenie',
        description: 'Nie udało się zapisać zmian timera. Zmiany mogą nie zostać zapisane.',
        variant: 'destructive',
      });
    },
  });
}

export const useDiscardTimer = createMutationHook<unknown, void>({
  mutationFn: () => timerApi.discard(),
  invalidateKeys: [queryKeys.timeTracking.timer.active],
  successMessage: 'Timer został odrzucony',
  errorMessage: 'Nie udało się odrzucić timera',
});

// ============================================
// Time Settings Hooks
// ============================================

export function useTimeSettings() {
  return useQuery({
    queryKey: queryKeys.timeTracking.settings,
    queryFn: () => timeSettingsApi.get(),
    ...TIME_SETTINGS_CACHE,
  });
}

export const useUpdateTimeSettings = createMutationHook<unknown, UpdateTimeSettingsDto>({
  mutationFn: (settingsData) => timeSettingsApi.update(settingsData),
  invalidateKeys: [queryKeys.timeTracking.settings],
  successMessage: 'Ustawienia zostały zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować ustawień',
});

// ============================================
// Timesheet Hooks
// ============================================

export function useDailyTimesheet(date: string) {
  return useQuery({
    queryKey: queryKeys.timeTracking.timesheet.daily(date),
    queryFn: () => timesheetApi.getDaily(date),
    enabled: !!date,
    ...TIMESHEET_CACHE,
  });
}

export function useWeeklyTimesheet(date: string) {
  return useQuery({
    queryKey: queryKeys.timeTracking.timesheet.weekly(date),
    queryFn: () => timesheetApi.getWeekly(date),
    enabled: !!date,
    ...TIMESHEET_CACHE,
  });
}

// ============================================
// Reports Hooks
// ============================================

export function useTimeSummaryReport(params: {
  startDate: string;
  endDate: string;
  groupBy?: 'project' | 'client' | 'user';
}) {
  return useQuery({
    queryKey: queryKeys.timeTracking.reports.summary(params),
    queryFn: () => timeReportsApi.getSummary(params),
    enabled: !!params.startDate && !!params.endDate,
    ...REPORT_CACHE,
  });
}

export function useTimeByClientReport(params: {
  startDate: string;
  endDate: string;
  clientId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.timeTracking.reports.byClient(params),
    queryFn: () => timeReportsApi.getByClient(params),
    enabled: !!params.startDate && !!params.endDate,
    ...REPORT_CACHE,
  });
}

export function useTopTasksByTime(preset: '30d' | '90d' | '365d' = '30d') {
  return useQuery({
    queryKey: queryKeys.timeTracking.extendedStats.topTasks(preset),
    queryFn: () => timeReportsApi.getTopTasksByTime({ preset }),
    ...REPORT_CACHE,
  });
}

export function useTopSettlementsByTime(preset: '30d' | '90d' | '365d' = '30d') {
  return useQuery({
    queryKey: queryKeys.timeTracking.extendedStats.topSettlements(preset),
    queryFn: () => timeReportsApi.getTopSettlementsByTime({ preset }),
    ...REPORT_CACHE,
  });
}

export function useEmployeeTimeBreakdown(preset: '30d' | '90d' | '365d' = '30d') {
  return useQuery({
    queryKey: queryKeys.timeTracking.extendedStats.employeeBreakdown(preset),
    queryFn: () => timeReportsApi.getEmployeeBreakdown({ preset }),
    ...REPORT_CACHE,
  });
}

export function useExportTimeReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      startDate: string;
      endDate: string;
      format: 'csv' | 'excel' | 'pdf';
      clientId?: string;
    }) => timeReportsApi.export(params),
    onSuccess: (blob, variables) => {
      const ext =
        variables.format === 'excel' ? 'xlsx' : variables.format === 'pdf' ? 'pdf' : 'csv';
      downloadBlob(blob, `time-report-${variables.startDate}-${variables.endDate}.${ext}`);

      toast({
        title: 'Sukces',
        description: 'Raport został wyeksportowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: getApiErrorMessage(error, 'Nie udało się wyeksportować raportu'),
        variant: 'destructive',
      });
    },
  });
}
