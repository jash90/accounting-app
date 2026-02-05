import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';

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


import {
  timeEntriesApi,
  timerApi,
  timeReportsApi,
  timeSettingsApi,
  timesheetApi,
} from '../api/endpoints/time-tracking';
import { queryKeys } from '../api/query-client';

// ============================================
// Helper Functions
// ============================================

/**
 * Predicate to match time entry list queries for selective cache invalidation.
 *
 * Used with `queryClient.invalidateQueries({ predicate })` to selectively invalidate
 * only list queries while preserving cached detail and timer queries.
 *
 * @param query - TanStack Query's Query object containing queryKey
 * @returns true if the query matches the time entry list pattern
 *
 * @example
 * // Matches: ['time-entries', 'list'] or ['time-entries', 'list', { filters }]
 * // Does NOT match: ['time-entries', 'abc-123'] (detail query)
 * // Does NOT match: ['time-tracking', 'timer', 'active'] (timer query)
 *
 * queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
 *
 * @see isEmailInboxQuery in use-email-client.ts for similar pattern
 */
const isTimeEntryListQuery = (query: Query): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === 'time-entries' && key[1] === 'list';
};

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

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (entryData: CreateTimeEntryDto) => timeEntriesApi.create(entryData),
    onSuccess: () => {
      // Only invalidate list queries, not detail/timer queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został utworzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się utworzyć wpisu czasu',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTimeEntryDto }) =>
      timeEntriesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeTracking.entries.detail(variables.id),
      });
      // Only invalidate list queries, not all time-entries queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został zaktualizowany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować wpisu czasu',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove the specific detail query from cache
      queryClient.removeQueries({ queryKey: queryKeys.timeTracking.entries.detail(deletedId) });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został usunięty',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się usunąć wpisu czasu',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Approval Workflow Hooks
// ============================================

export function useSubmitTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.submit(id),
    onSuccess: (_, id) => {
      // Invalidate the specific detail query
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został wysłany do zatwierdzenia',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wysłać wpisu do zatwierdzenia',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.approve(id),
    onSuccess: (_, id) => {
      // Invalidate the specific detail query
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został zatwierdzony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zatwierdzić wpisu czasu',
        variant: 'destructive',
      });
    },
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectTimeEntryDto }) =>
      timeEntriesApi.reject(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeTracking.entries.detail(variables.id),
      });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Wpis czasu został odrzucony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się odrzucić wpisu czasu',
        variant: 'destructive',
      });
    },
  });
}

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

export function useStartTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: StartTimerDto) => timerApi.start(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.timer.active });
      // Only invalidate list queries
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Timer został uruchomiony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się uruchomić timera',
        variant: 'destructive',
      });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto?: StopTimerDto) => timerApi.stop(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.timer.active });
      // Only invalidate list queries (new entry was created)
      queryClient.invalidateQueries({ predicate: isTimeEntryListQuery });
      toast({
        title: 'Sukces',
        description: 'Timer został zatrzymany, wpis czasu zapisany',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zatrzymać timera',
        variant: 'destructive',
      });
    },
  });
}

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

export function useDiscardTimer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => timerApi.discard(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.timer.active });
      toast({
        title: 'Sukces',
        description: 'Timer został odrzucony',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się odrzucić timera',
        variant: 'destructive',
      });
    },
  });
}

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

export function useUpdateTimeSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settingsData: UpdateTimeSettingsDto) => timeSettingsApi.update(settingsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.settings });
      toast({
        title: 'Sukces',
        description: 'Ustawienia zostały zaktualizowane',
      });
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się zaktualizować ustawień',
        variant: 'destructive',
      });
    },
  });
}

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

export function useExportTimeReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      startDate: string;
      endDate: string;
      format: 'csv' | 'excel';
      clientId?: string;
    }) => timeReportsApi.export(params),
    onSuccess: (blob, variables) => {
      // Create download link with proper cleanup to prevent memory leaks
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      try {
        a.href = url;
        a.download = `time-report-${variables.startDate}-${variables.endDate}.${variables.format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();

        toast({
          title: 'Sukces',
          description: 'Raport został wyeksportowany',
        });
      } finally {
        // Always clean up the blob URL and DOM element to prevent memory leaks
        window.URL.revokeObjectURL(url);
        if (a.parentNode) {
          document.body.removeChild(a);
        }
      }
    },
    onError: (error: ApiErrorResponse) => {
      toast({
        title: 'Błąd',
        description: error.response?.data?.message || 'Nie udało się wyeksportować raportu',
        variant: 'destructive',
      });
    },
  });
}
