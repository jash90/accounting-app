import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  timeEntriesApi,
  timerApi,
  timeSettingsApi,
  timesheetApi,
  timeReportsApi,
} from '../api/endpoints/time-tracking';
import { queryKeys } from '../api/query-client';
import {
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  TimeEntryFiltersDto,
  StartTimerDto,
  StopTimerDto,
  UpdateTimerDto,
  RejectTimeEntryDto,
  UpdateTimeSettingsDto,
} from '@/types/dtos';
import { ApiErrorResponse } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';

// Named constants for timer intervals and timeouts
// Sync timer state with server periodically to keep elapsed time accurate on multiple devices/tabs
const TIMER_REFETCH_INTERVAL_MS = 10000; // 10 seconds

// ============================================
// Time Entry Hooks
// ============================================

export function useTimeEntries(filters?: TimeEntryFiltersDto) {
  return useQuery({
    queryKey: queryKeys.timeTracking.entries.list(filters),
    queryFn: () => timeEntriesApi.getAll(filters),
  });
}

export function useTimeEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.timeTracking.entries.detail(id),
    queryFn: () => timeEntriesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (entryData: CreateTimeEntryDto) => timeEntriesApi.create(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(variables.id) });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(id) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.detail(variables.id) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.timeTracking.entries.all });
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
  });
}

export function useWeeklyTimesheet(date: string) {
  return useQuery({
    queryKey: queryKeys.timeTracking.timesheet.weekly(date),
    queryFn: () => timesheetApi.getWeekly(date),
    enabled: !!date,
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
