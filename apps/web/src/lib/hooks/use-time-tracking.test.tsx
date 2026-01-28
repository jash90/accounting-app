import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useTimeEntries,
  useTimeEntry,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useSubmitTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useUpdateTimer,
  useDiscardTimer,
  useTimeSettings,
  useUpdateTimeSettings,
  useDailyTimesheet,
  useWeeklyTimesheet,
  useTimeSummaryReport,
  useTimeByClientReport,
  useExportTimeReport,
} from './use-time-tracking';
import {
  timeEntriesApi,
  timerApi,
  timeSettingsApi,
  timesheetApi,
  timeReportsApi,
} from '../api/endpoints/time-tracking';

// Mock the API modules
vi.mock('../api/endpoints/time-tracking');
vi.mock('@/components/ui/use-toast');

const mockToast = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockTimeEntry = {
  id: 'entry-123',
  description: 'Test entry',
  startTime: '2024-01-15T09:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  durationMinutes: 120,
  isRunning: false,
  isBillable: true,
  status: 'draft',
  companyId: 'company-123',
  userId: 'user-123',
  createdById: 'user-123',
  isActive: true,
};

const mockRunningEntry = {
  ...mockTimeEntry,
  id: 'running-entry-123',
  endTime: null,
  durationMinutes: null,
  isRunning: true,
};

const mockTimeSettings = {
  id: 'settings-123',
  companyId: 'company-123',
  roundingMethod: 'none',
  roundingIntervalMinutes: 15,
  defaultHourlyRate: 100,
  requireApproval: false,
  allowOverlappingEntries: true,
};

const mockPaginatedResponse = {
  data: [mockTimeEntry],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

describe('use-time-tracking hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Time Entry Query Hooks
  // ========================================

  describe('useTimeEntries', () => {
    it('should fetch time entries', async () => {
      vi.mocked(timeEntriesApi.getAll).mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => useTimeEntries(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(timeEntriesApi.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to API', async () => {
      vi.mocked(timeEntriesApi.getAll).mockResolvedValue(mockPaginatedResponse);
      const filters = { status: 'draft' as const, page: 2 };

      const { result } = renderHook(() => useTimeEntries(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useTimeEntry', () => {
    it('should fetch single time entry', async () => {
      vi.mocked(timeEntriesApi.getById).mockResolvedValue(mockTimeEntry);

      const { result } = renderHook(() => useTimeEntry('entry-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTimeEntry);
      expect(timeEntriesApi.getById).toHaveBeenCalledWith('entry-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useTimeEntry(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(timeEntriesApi.getById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Time Entry Mutation Hooks
  // ========================================

  describe('useCreateTimeEntry', () => {
    it('should create time entry and show success toast', async () => {
      vi.mocked(timeEntriesApi.create).mockResolvedValue(mockTimeEntry);

      const { result } = renderHook(() => useCreateTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: 'New entry',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sukces',
        })
      );
    });

    it('should show error toast on failure', async () => {
      const mockError = {
        response: { data: { message: 'Validation failed' } },
      };
      vi.mocked(timeEntriesApi.create).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: 'New entry',
          startTime: '2024-01-15T09:00:00Z',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useUpdateTimeEntry', () => {
    it('should update time entry and show success toast', async () => {
      vi.mocked(timeEntriesApi.update).mockResolvedValue({
        ...mockTimeEntry,
        description: 'Updated',
      });

      const { result } = renderHook(() => useUpdateTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'entry-123',
          data: { description: 'Updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.update).toHaveBeenCalledWith('entry-123', {
        description: 'Updated',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteTimeEntry', () => {
    it('should delete time entry and show success toast', async () => {
      vi.mocked(timeEntriesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('entry-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.delete).toHaveBeenCalledWith('entry-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Approval Workflow Hooks
  // ========================================

  describe('useSubmitTimeEntry', () => {
    it('should submit time entry for approval', async () => {
      vi.mocked(timeEntriesApi.submit).mockResolvedValue({
        ...mockTimeEntry,
        status: 'submitted',
      });

      const { result } = renderHook(() => useSubmitTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('entry-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.submit).toHaveBeenCalledWith('entry-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useApproveTimeEntry', () => {
    it('should approve time entry', async () => {
      vi.mocked(timeEntriesApi.approve).mockResolvedValue({
        ...mockTimeEntry,
        status: 'approved',
      });

      const { result } = renderHook(() => useApproveTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('entry-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.approve).toHaveBeenCalledWith('entry-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useRejectTimeEntry', () => {
    it('should reject time entry with note', async () => {
      vi.mocked(timeEntriesApi.reject).mockResolvedValue({
        ...mockTimeEntry,
        status: 'rejected',
        rejectionNote: 'Invalid entry',
      });

      const { result } = renderHook(() => useRejectTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'entry-123',
          data: { rejectionNote: 'Invalid entry' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeEntriesApi.reject).toHaveBeenCalledWith('entry-123', {
        rejectionNote: 'Invalid entry',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Timer Hooks
  // ========================================

  describe('useActiveTimer', () => {
    it('should fetch active timer', async () => {
      vi.mocked(timerApi.getActive).mockResolvedValue(mockRunningEntry);

      const { result } = renderHook(() => useActiveTimer(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRunningEntry);
      expect(timerApi.getActive).toHaveBeenCalled();
    });

    it('should return null when no timer is running', async () => {
      vi.mocked(timerApi.getActive).mockResolvedValue(null);

      const { result } = renderHook(() => useActiveTimer(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useStartTimer', () => {
    it('should start timer and show success toast', async () => {
      vi.mocked(timerApi.start).mockResolvedValue(mockRunningEntry);

      const { result } = renderHook(() => useStartTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ description: 'New timer' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timerApi.start).toHaveBeenCalledWith({ description: 'New timer' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error when timer already running', async () => {
      const mockError = {
        response: { data: { message: 'Timer jest już uruchomiony' } },
      };
      vi.mocked(timerApi.start).mockRejectedValue(mockError);

      const { result } = renderHook(() => useStartTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ description: 'New timer' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      );
    });
  });

  describe('useStopTimer', () => {
    it('should stop timer and show success toast', async () => {
      vi.mocked(timerApi.stop).mockResolvedValue({
        ...mockTimeEntry,
        isRunning: false,
      });

      const { result } = renderHook(() => useStopTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ description: 'Final notes' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timerApi.stop).toHaveBeenCalledWith({ description: 'Final notes' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should stop timer without additional description', async () => {
      vi.mocked(timerApi.stop).mockResolvedValue({
        ...mockTimeEntry,
        isRunning: false,
      });

      const { result } = renderHook(() => useStopTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timerApi.stop).toHaveBeenCalledWith(undefined);
    });
  });

  describe('useUpdateTimer', () => {
    it('should update running timer', async () => {
      vi.mocked(timerApi.update).mockResolvedValue({
        ...mockRunningEntry,
        description: 'Updated timer',
      });

      const { result } = renderHook(() => useUpdateTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ description: 'Updated timer' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timerApi.update).toHaveBeenCalledWith({ description: 'Updated timer' });
    });

    it('should show warning toast on error', async () => {
      vi.mocked(timerApi.update).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ description: 'Updated timer' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ostrzeżenie',
          variant: 'destructive',
        })
      );
    });
  });

  describe('useDiscardTimer', () => {
    it('should discard running timer', async () => {
      vi.mocked(timerApi.discard).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDiscardTimer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timerApi.discard).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Time Settings Hooks
  // ========================================

  describe('useTimeSettings', () => {
    it('should fetch time settings', async () => {
      vi.mocked(timeSettingsApi.get).mockResolvedValue(mockTimeSettings);

      const { result } = renderHook(() => useTimeSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTimeSettings);
      expect(timeSettingsApi.get).toHaveBeenCalled();
    });
  });

  describe('useUpdateTimeSettings', () => {
    it('should update time settings', async () => {
      vi.mocked(timeSettingsApi.update).mockResolvedValue({
        ...mockTimeSettings,
        defaultHourlyRate: 150,
      });

      const { result } = renderHook(() => useUpdateTimeSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ defaultHourlyRate: 150 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeSettingsApi.update).toHaveBeenCalledWith({
        defaultHourlyRate: 150,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Timesheet Hooks
  // ========================================

  describe('useDailyTimesheet', () => {
    it('should fetch daily timesheet', async () => {
      const mockDaily = { date: '2024-01-15', entries: [mockTimeEntry] };
      vi.mocked(timesheetApi.getDaily).mockResolvedValue(mockDaily);

      const { result } = renderHook(() => useDailyTimesheet('2024-01-15'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDaily);
      expect(timesheetApi.getDaily).toHaveBeenCalledWith('2024-01-15');
    });

    it('should not fetch when date is empty', async () => {
      const { result } = renderHook(() => useDailyTimesheet(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(timesheetApi.getDaily).not.toHaveBeenCalled();
    });
  });

  describe('useWeeklyTimesheet', () => {
    it('should fetch weekly timesheet', async () => {
      const mockWeekly = { weekStart: '2024-01-15', entries: [mockTimeEntry] };
      vi.mocked(timesheetApi.getWeekly).mockResolvedValue(mockWeekly);

      const { result } = renderHook(() => useWeeklyTimesheet('2024-01-15'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWeekly);
      expect(timesheetApi.getWeekly).toHaveBeenCalledWith('2024-01-15');
    });

    it('should not fetch when date is empty', async () => {
      const { result } = renderHook(() => useWeeklyTimesheet(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(timesheetApi.getWeekly).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Reports Hooks
  // ========================================

  describe('useTimeSummaryReport', () => {
    const mockSummaryReport = {
      totalHours: 120,
      totalAmount: 12000,
      entries: [mockTimeEntry],
    };

    it('should fetch summary report when dates are provided', async () => {
      vi.mocked(timeReportsApi.getSummary).mockResolvedValue(mockSummaryReport);

      const { result } = renderHook(
        () =>
          useTimeSummaryReport({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            groupBy: 'client',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSummaryReport);
      expect(timeReportsApi.getSummary).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        groupBy: 'client',
      });
    });

    it('should not fetch when startDate is empty', async () => {
      const { result } = renderHook(
        () =>
          useTimeSummaryReport({
            startDate: '',
            endDate: '2024-01-31',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(timeReportsApi.getSummary).not.toHaveBeenCalled();
    });

    it('should not fetch when endDate is empty', async () => {
      const { result } = renderHook(
        () =>
          useTimeSummaryReport({
            startDate: '2024-01-01',
            endDate: '',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(timeReportsApi.getSummary).not.toHaveBeenCalled();
    });
  });

  describe('useTimeByClientReport', () => {
    const mockClientReport = {
      clientId: 'client-123',
      clientName: 'Test Client',
      totalHours: 40,
      entries: [mockTimeEntry],
    };

    it('should fetch client report when dates are provided', async () => {
      vi.mocked(timeReportsApi.getByClient).mockResolvedValue(mockClientReport);

      const { result } = renderHook(
        () =>
          useTimeByClientReport({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            clientId: 'client-123',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClientReport);
      expect(timeReportsApi.getByClient).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        clientId: 'client-123',
      });
    });

    it('should not fetch when startDate is empty', async () => {
      const { result } = renderHook(
        () =>
          useTimeByClientReport({
            startDate: '',
            endDate: '2024-01-31',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(timeReportsApi.getByClient).not.toHaveBeenCalled();
    });
  });

  describe('useExportTimeReport', () => {
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalRevokeObjectURL = global.URL.revokeObjectURL;
    const mockCreateObjectURL = vi.fn();
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();

    beforeEach(() => {
      // Mock URL methods
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      mockCreateObjectURL.mockReturnValue('blob:test-url');

      // Mock anchor click - this prevents actual navigation
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockClick);
    });

    afterEach(() => {
      // Restore URL methods
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('should export report as CSV and handle blob cleanup', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      vi.mocked(timeReportsApi.export).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeReportsApi.export).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'csv',
      });
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockClick).toHaveBeenCalled();
      // Verify cleanup
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should export report as Excel', async () => {
      const mockBlob = new Blob(['test data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      vi.mocked(timeReportsApi.export).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'excel',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeReportsApi.export).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'excel',
      });
    });

    it('should export with clientId filter', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      vi.mocked(timeReportsApi.export).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
          clientId: 'client-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(timeReportsApi.export).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'csv',
        clientId: 'client-123',
      });
    });

    it('should show error toast on export failure', async () => {
      const mockError = {
        response: { data: { message: 'Export failed' } },
      };
      vi.mocked(timeReportsApi.export).mockRejectedValue(mockError);

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          description: 'Export failed',
          variant: 'destructive',
        })
      );
    });

    it('should show generic error message when API error has no message', async () => {
      vi.mocked(timeReportsApi.export).mockRejectedValue({});

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się wyeksportować raportu',
        })
      );
    });

    it('should trigger download with proper filename', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      vi.mocked(timeReportsApi.export).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportTimeReport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'csv',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify anchor was clicked to trigger download
      expect(mockClick).toHaveBeenCalled();
    });
  });

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should show generic error message when API error has no message', async () => {
      vi.mocked(timeEntriesApi.create).mockRejectedValue({});

      const { result } = renderHook(() => useCreateTimeEntry(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: 'New entry',
          startTime: '2024-01-15T09:00:00Z',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się utworzyć wpisu czasu',
        })
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(timeEntriesApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useTimeEntries(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
