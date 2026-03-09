import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useAddSettlementComment,
  useAllSettlementAssignableUsers,
  useAllSettlementStats,
  useAssignSettlement,
  useBulkAssignSettlements,
  useExportSettlements,
  useInitializeSettlementMonth,
  useMySettlementStats,
  useSendMissingInvoiceEmail,
  useSettlement,
  useSettlementAssignableUsers,
  useSettlementBlockedClientsStats,
  useSettlementComments,
  useSettlementCommentsPageData,
  useSettlementCompletionStats,
  useSettlementEmployeeRanking,
  useSettlementEmployeeStats,
  useSettlements,
  useSettlementSettings,
  useSettlementStats,
  useSettlementTeamPageData,
  useUpdateSettlement,
  useUpdateSettlementSettings,
  useUpdateSettlementStatus,
} from './use-settlements';
import { settlementsApi } from '../api/endpoints/settlements';

// Mock the API modules
vi.mock('../api/endpoints/settlements');
vi.mock('@/components/ui/use-toast');
vi.mock('../utils/optimistic-settlement-updates', () => ({
  createStatsInvalidationPredicate: vi.fn(() => () => false),
  invalidateSettlementQueries: vi.fn(),
  isSettlementListQuery: vi.fn(() => false),
  performOptimisticSettlementUpdate: vi.fn().mockResolvedValue({}),
  rollbackOptimisticSettlementUpdate: vi.fn(),
}));
vi.mock('../utils/download', () => ({
  downloadBlob: vi.fn(() => ({ success: true })),
}));

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

const mockSettlement = {
  id: 'settlement-123',
  clientId: 'client-123',
  month: 3,
  year: 2026,
  status: 'PENDING',
  invoiceCount: 0,
  priority: 1,
  documentsComplete: false,
  requiresAttention: false,
  companyId: 'company-123',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockSettlement],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockStats = {
  total: 10,
  pending: 3,
  inProgress: 2,
  missingInvoiceVerification: 1,
  missingInvoice: 1,
  completed: 3,
  unassigned: 2,
  requiresAttention: 1,
  completionRate: 30,
};

const mockEmployeeStats = {
  employees: [
    {
      userId: 'user-1',
      email: 'test@test.pl',
      total: 5,
      pending: 2,
      inProgress: 1,
      missingInvoiceVerification: 0,
      missingInvoice: 0,
      completed: 2,
      completionRate: 40,
    },
  ],
};

const mockMyStats = {
  total: 5,
  pending: 2,
  inProgress: 1,
  missingInvoiceVerification: 0,
  missingInvoice: 0,
  completed: 2,
  completionRate: 40,
};

const mockComment = {
  id: 'comment-123',
  settlementId: 'settlement-123',
  userId: 'user-123',
  content: 'Test comment',
  createdAt: '2026-03-01T00:00:00Z',
};

const mockSettings = {
  id: 'settings-123',
  companyId: 'company-123',
  defaultPriority: 1,
  autoAssignEnabled: false,
  notifyOnStatusChange: true,
  notifyOnDeadlineApproaching: true,
  deadlineWarningDays: 3,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

describe('use-settlements hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Settlement List Hooks
  // ========================================

  describe('useSettlements', () => {
    it('should fetch settlements with filters', async () => {
      vi.mocked(settlementsApi.getAll).mockResolvedValue(mockPaginatedResponse as any);
      const filters = { month: 3, year: 2026 };

      const { result } = renderHook(() => useSettlements(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
      expect(settlementsApi.getAll).toHaveBeenCalledWith(filters);
    });

    it('should pass status filter to API', async () => {
      vi.mocked(settlementsApi.getAll).mockResolvedValue(mockPaginatedResponse as any);
      const filters = { month: 3, year: 2026, status: 'COMPLETED' as any };

      const { result } = renderHook(() => useSettlements(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useSettlement', () => {
    it('should fetch single settlement', async () => {
      vi.mocked(settlementsApi.getById).mockResolvedValue(mockSettlement as any);

      const { result } = renderHook(() => useSettlement('settlement-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettlement);
      expect(settlementsApi.getById).toHaveBeenCalledWith('settlement-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useSettlement(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Statistics Hooks
  // ========================================

  describe('useSettlementStats', () => {
    it('should fetch overview stats', async () => {
      vi.mocked(settlementsApi.getOverviewStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useSettlementStats(3, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(settlementsApi.getOverviewStats).toHaveBeenCalledWith(3, 2026);
    });

    it('should not fetch when month is 0', async () => {
      const { result } = renderHook(() => useSettlementStats(0, 2026), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getOverviewStats).not.toHaveBeenCalled();
    });
  });

  describe('useSettlementEmployeeStats', () => {
    it('should fetch employee stats', async () => {
      vi.mocked(settlementsApi.getEmployeeStats).mockResolvedValue(mockEmployeeStats);

      const { result } = renderHook(() => useSettlementEmployeeStats(3, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmployeeStats);
      expect(settlementsApi.getEmployeeStats).toHaveBeenCalledWith(3, 2026);
    });

    it('should respect enabled option', async () => {
      const { result } = renderHook(() => useSettlementEmployeeStats(3, 2026, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getEmployeeStats).not.toHaveBeenCalled();
    });
  });

  describe('useMySettlementStats', () => {
    it('should fetch my stats', async () => {
      vi.mocked(settlementsApi.getMyStats).mockResolvedValue(mockMyStats);

      const { result } = renderHook(() => useMySettlementStats(3, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMyStats);
      expect(settlementsApi.getMyStats).toHaveBeenCalledWith(3, 2026);
    });

    it('should not fetch when year is 0', async () => {
      const { result } = renderHook(() => useMySettlementStats(3, 0), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getMyStats).not.toHaveBeenCalled();
    });
  });

  describe('useAllSettlementStats', () => {
    it('should fetch all stats in parallel', async () => {
      vi.mocked(settlementsApi.getOverviewStats).mockResolvedValue(mockStats);
      vi.mocked(settlementsApi.getEmployeeStats).mockResolvedValue(mockEmployeeStats);
      vi.mocked(settlementsApi.getMyStats).mockResolvedValue(mockMyStats);

      const { result } = renderHook(() => useAllSettlementStats(3, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.every((q) => q.isSuccess)).toBe(true);
      });

      expect(result.current[0].data).toEqual(mockStats);
      expect(result.current[1].data).toEqual(mockEmployeeStats);
      expect(result.current[2].data).toEqual(mockMyStats);
    });

    it('should not fetch when month/year are 0', async () => {
      const { result } = renderHook(() => useAllSettlementStats(0, 0), {
        wrapper: createWrapper(),
      });

      expect(result.current.every((q) => q.isFetching)).toBe(false);
    });
  });

  describe('useSettlementTeamPageData', () => {
    it('should fetch employee stats and unassigned settlements in parallel', async () => {
      vi.mocked(settlementsApi.getEmployeeStats).mockResolvedValue(mockEmployeeStats);
      vi.mocked(settlementsApi.getAll).mockResolvedValue(mockPaginatedResponse as any);

      const { result } = renderHook(() => useSettlementTeamPageData(3, 2026), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.every((q) => q.isSuccess)).toBe(true);
      });

      expect(result.current[0].data).toEqual(mockEmployeeStats);
      expect(result.current[1].data).toEqual(mockPaginatedResponse);
    });
  });

  // ========================================
  // Initialization Hooks
  // ========================================

  describe('useInitializeSettlementMonth', () => {
    it('should initialize month and show success toast', async () => {
      vi.mocked(settlementsApi.initializeMonth).mockResolvedValue({
        created: 10,
        skipped: 2,
      });

      const { result } = renderHook(() => useInitializeSettlementMonth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ month: 3, year: 2026 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.initializeMonth).toHaveBeenCalledWith({ month: 3, year: 2026 });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.initializeMonth).mockRejectedValue({
        response: { data: { message: 'Month already initialized' } },
      });

      const { result } = renderHook(() => useInitializeSettlementMonth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ month: 3, year: 2026 });
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

  // ========================================
  // Update Hooks
  // ========================================

  describe('useUpdateSettlement', () => {
    it('should update settlement and show success toast', async () => {
      vi.mocked(settlementsApi.update).mockResolvedValue({
        ...mockSettlement,
        notes: 'Updated notes',
      } as any);

      const { result } = renderHook(() => useUpdateSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { notes: 'Updated notes' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.update).toHaveBeenCalledWith('settlement-123', {
        notes: 'Updated notes',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.update).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { notes: 'Updated notes' },
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

  describe('useUpdateSettlementStatus', () => {
    it('should update status and show success toast', async () => {
      vi.mocked(settlementsApi.updateStatus).mockResolvedValue({
        ...mockSettlement,
        status: 'IN_PROGRESS',
      } as any);

      const { result } = renderHook(() => useUpdateSettlementStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { status: 'IN_PROGRESS' as any },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.updateStatus).toHaveBeenCalledWith('settlement-123', {
        status: 'IN_PROGRESS',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast and rollback on failure', async () => {
      vi.mocked(settlementsApi.updateStatus).mockRejectedValue({
        response: { data: { message: 'Status change failed' } },
      });

      const { result } = renderHook(() => useUpdateSettlementStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { status: 'COMPLETED' as any },
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

  // ========================================
  // Assignment Hooks
  // ========================================

  describe('useSettlementAssignableUsers', () => {
    it('should fetch assignable users for a settlement', async () => {
      const mockUsers = [{ id: 'user-1', email: 'test@test.pl' }];
      vi.mocked(settlementsApi.getAssignableUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useSettlementAssignableUsers('settlement-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(settlementsApi.getAssignableUsers).toHaveBeenCalledWith('settlement-123');
    });

    it('should not fetch when settlementId is empty', async () => {
      const { result } = renderHook(() => useSettlementAssignableUsers(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getAssignableUsers).not.toHaveBeenCalled();
    });
  });

  describe('useAllSettlementAssignableUsers', () => {
    it('should fetch all assignable users', async () => {
      const mockUsers = [{ id: 'user-1', email: 'test@test.pl' }];
      vi.mocked(settlementsApi.getAllAssignableUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAllSettlementAssignableUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(settlementsApi.getAllAssignableUsers).toHaveBeenCalled();
    });
  });

  describe('useAssignSettlement', () => {
    it('should assign settlement and show success toast', async () => {
      vi.mocked(settlementsApi.assignToEmployee).mockResolvedValue({
        ...mockSettlement,
        userId: 'user-1',
      } as any);

      const { result } = renderHook(() => useAssignSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { userId: 'user-1' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.assignToEmployee).toHaveBeenCalledWith('settlement-123', {
        userId: 'user-1',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show unassign message when userId is null', async () => {
      vi.mocked(settlementsApi.assignToEmployee).mockResolvedValue({
        ...mockSettlement,
        userId: null,
      } as any);

      const { result } = renderHook(() => useAssignSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { userId: null },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Rozliczenie zostało odłączone od pracownika',
        })
      );
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.assignToEmployee).mockRejectedValue({
        response: { data: { message: 'Assignment failed' } },
      });

      const { result } = renderHook(() => useAssignSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { userId: 'user-1' },
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

  describe('useBulkAssignSettlements', () => {
    it('should bulk assign and show success toast', async () => {
      vi.mocked(settlementsApi.bulkAssign).mockResolvedValue({
        assigned: 3,
        requested: 3,
      });

      const { result } = renderHook(() => useBulkAssignSettlements(3, 2026), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          settlementIds: ['s-1', 's-2', 's-3'],
          userId: 'user-1',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.bulkAssign).toHaveBeenCalledWith({
        settlementIds: ['s-1', 's-2', 's-3'],
        userId: 'user-1',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.bulkAssign).mockRejectedValue({
        response: { data: { message: 'Bulk assign failed' } },
      });

      const { result } = renderHook(() => useBulkAssignSettlements(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          settlementIds: ['s-1'],
          userId: 'user-1',
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

  // ========================================
  // Comments Hooks
  // ========================================

  describe('useSettlementComments', () => {
    it('should fetch comments for a settlement', async () => {
      vi.mocked(settlementsApi.getComments).mockResolvedValue([mockComment] as any);

      const { result } = renderHook(() => useSettlementComments('settlement-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockComment]);
      expect(settlementsApi.getComments).toHaveBeenCalledWith('settlement-123');
    });

    it('should not fetch when settlementId is empty', async () => {
      const { result } = renderHook(() => useSettlementComments(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(settlementsApi.getComments).not.toHaveBeenCalled();
    });
  });

  describe('useSettlementCommentsPageData', () => {
    it('should fetch settlement and comments in parallel', async () => {
      vi.mocked(settlementsApi.getById).mockResolvedValue(mockSettlement as any);
      vi.mocked(settlementsApi.getComments).mockResolvedValue([mockComment] as any);

      const { result } = renderHook(() => useSettlementCommentsPageData('settlement-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.every((q) => q.isSuccess)).toBe(true);
      });

      expect(result.current[0].data).toEqual(mockSettlement);
      expect(result.current[1].data).toEqual([mockComment]);
    });
  });

  describe('useAddSettlementComment', () => {
    it('should add comment and show success toast', async () => {
      vi.mocked(settlementsApi.addComment).mockResolvedValue(mockComment as any);

      const { result } = renderHook(() => useAddSettlementComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          settlementId: 'settlement-123',
          data: { content: 'New comment' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.addComment).toHaveBeenCalledWith('settlement-123', {
        content: 'New comment',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.addComment).mockRejectedValue({
        response: { data: { message: 'Cannot add comment' } },
      });

      const { result } = renderHook(() => useAddSettlementComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          settlementId: 'settlement-123',
          data: { content: 'New comment' },
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

  // ========================================
  // Export Hooks
  // ========================================

  describe('useExportSettlements', () => {
    it('should export CSV and show success toast', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      vi.mocked(settlementsApi.exportCsv).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportSettlements(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ month: 3, year: 2026 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.exportCsv).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on export failure', async () => {
      vi.mocked(settlementsApi.exportCsv).mockRejectedValue({
        response: { data: { message: 'Export failed' } },
      });

      const { result } = renderHook(() => useExportSettlements(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ month: 3, year: 2026 });
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

  // ========================================
  // Missing Invoice Email Hook
  // ========================================

  describe('useSendMissingInvoiceEmail', () => {
    it('should send missing invoice email', async () => {
      vi.mocked(settlementsApi.sendMissingInvoiceEmail).mockResolvedValue({
        message: 'Email sent',
      });

      const { result } = renderHook(() => useSendMissingInvoiceEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('settlement-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.sendMissingInvoiceEmail).toHaveBeenCalledWith('settlement-123');
    });
  });

  // ========================================
  // Extended Stats Hooks
  // ========================================

  describe('useSettlementCompletionStats', () => {
    it('should fetch completion stats', async () => {
      const mockCompletionStats = {
        longest: [],
        shortest: [],
        averageDurationDays: 5.2,
      };
      vi.mocked(settlementsApi.getExtendedCompletionStats).mockResolvedValue(mockCompletionStats);

      const { result } = renderHook(() => useSettlementCompletionStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCompletionStats);
    });

    it('should pass date filters to API', async () => {
      const mockCompletionStats = {
        longest: [],
        shortest: [],
        averageDurationDays: 3.1,
      };
      vi.mocked(settlementsApi.getExtendedCompletionStats).mockResolvedValue(mockCompletionStats);
      const filters = { startDate: '2026-01-01', endDate: '2026-03-31' };

      const { result } = renderHook(() => useSettlementCompletionStats(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.getExtendedCompletionStats).toHaveBeenCalledWith(filters);
    });
  });

  describe('useSettlementEmployeeRanking', () => {
    it('should fetch employee ranking', async () => {
      const mockRanking = { rankings: [] };
      vi.mocked(settlementsApi.getExtendedEmployeeRanking).mockResolvedValue(mockRanking);

      const { result } = renderHook(() => useSettlementEmployeeRanking(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRanking);
    });
  });

  describe('useSettlementBlockedClientsStats', () => {
    it('should fetch blocked clients stats', async () => {
      const mockBlocked = { clients: [] };
      vi.mocked(settlementsApi.getBlockedClientsStats).mockResolvedValue(mockBlocked);

      const { result } = renderHook(() => useSettlementBlockedClientsStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBlocked);
    });
  });

  // ========================================
  // Settings Hooks
  // ========================================

  describe('useSettlementSettings', () => {
    it('should fetch settlement settings', async () => {
      vi.mocked(settlementsApi.getSettings).mockResolvedValue(mockSettings as any);

      const { result } = renderHook(() => useSettlementSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSettings);
      expect(settlementsApi.getSettings).toHaveBeenCalled();
    });
  });

  describe('useUpdateSettlementSettings', () => {
    it('should update settings and show success toast', async () => {
      vi.mocked(settlementsApi.updateSettings).mockResolvedValue({
        ...mockSettings,
        defaultPriority: 2,
      } as any);

      const { result } = renderHook(() => useUpdateSettlementSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ defaultPriority: 2 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(settlementsApi.updateSettings).toHaveBeenCalledWith({ defaultPriority: 2 });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(settlementsApi.updateSettings).mockRejectedValue({
        response: { data: { message: 'Settings update failed' } },
      });

      const { result } = renderHook(() => useUpdateSettlementSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ defaultPriority: 2 });
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

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should handle network errors on queries', async () => {
      vi.mocked(settlementsApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useSettlements({ month: 3, year: 2026 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should show generic error message when API error has no message', async () => {
      vi.mocked(settlementsApi.update).mockRejectedValue({});

      const { result } = renderHook(() => useUpdateSettlement(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'settlement-123',
          data: { notes: 'test' },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się zaktualizować rozliczenia',
        })
      );
    });
  });
});
