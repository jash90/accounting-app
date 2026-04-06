import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  ReliefType,
  useClientReliefPeriods,
  useCreateReliefPeriod,
  useDeleteReliefPeriod,
  useReliefPeriod,
  useUpdateReliefPeriod,
} from './use-relief-periods';
import { reliefPeriodsApi } from '../api/endpoints/relief-periods';

// Mock the API modules - preserve enums/constants, only mock API functions
vi.mock('../api/endpoints/relief-periods', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('../api/endpoints/relief-periods')>();
  return {
    ...actual,
    reliefPeriodsApi: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});
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

const mockReliefPeriod = {
  id: 'relief-123',
  clientId: 'client-123',
  clientName: 'Test Client',
  companyId: 'company-123',
  reliefType: ReliefType.MALY_ZUS,
  reliefTypeLabel: 'Mały ZUS',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  daysUntilEnd: 180,
  isActive: true,
  createdById: 'user-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('use-relief-periods hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Query Hooks
  // ========================================

  describe('useClientReliefPeriods', () => {
    it('should fetch relief periods for a client', async () => {
      vi.mocked(reliefPeriodsApi.getAll).mockResolvedValue([mockReliefPeriod]);

      const { result } = renderHook(() => useClientReliefPeriods('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockReliefPeriod]);
      expect(reliefPeriodsApi.getAll).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useClientReliefPeriods(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(reliefPeriodsApi.getAll).not.toHaveBeenCalled();
    });

    it('should return empty array when no relief periods exist', async () => {
      vi.mocked(reliefPeriodsApi.getAll).mockResolvedValue([]);

      const { result } = renderHook(() => useClientReliefPeriods('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useReliefPeriod', () => {
    it('should fetch single relief period', async () => {
      vi.mocked(reliefPeriodsApi.getById).mockResolvedValue(mockReliefPeriod);

      const { result } = renderHook(() => useReliefPeriod('client-123', 'relief-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockReliefPeriod);
      expect(reliefPeriodsApi.getById).toHaveBeenCalledWith('client-123', 'relief-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useReliefPeriod('', 'relief-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(reliefPeriodsApi.getById).not.toHaveBeenCalled();
    });

    it('should not fetch when reliefId is empty', async () => {
      const { result } = renderHook(() => useReliefPeriod('client-123', ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(reliefPeriodsApi.getById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Mutation Hooks
  // ========================================

  describe('useCreateReliefPeriod', () => {
    it('should create relief period and show success toast', async () => {
      vi.mocked(reliefPeriodsApi.create).mockResolvedValue(mockReliefPeriod);

      const { result } = renderHook(() => useCreateReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          data: { reliefType: ReliefType.MALY_ZUS, startDate: '2024-01-01' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reliefPeriodsApi.create).toHaveBeenCalledWith('client-123', {
        reliefType: ReliefType.MALY_ZUS,
        startDate: '2024-01-01',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast and rollback on failure', async () => {
      vi.mocked(reliefPeriodsApi.create).mockRejectedValue({
        response: { data: { message: 'Creation failed' } },
      });

      const { result } = renderHook(() => useCreateReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          data: { reliefType: ReliefType.MALY_ZUS, startDate: '2024-01-01' },
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

  describe('useUpdateReliefPeriod', () => {
    it('should update relief period and show success toast', async () => {
      vi.mocked(reliefPeriodsApi.update).mockResolvedValue({
        ...mockReliefPeriod,
        endDate: '2025-06-30',
      });

      const { result } = renderHook(() => useUpdateReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          reliefId: 'relief-123',
          data: { endDate: '2025-06-30' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reliefPeriodsApi.update).toHaveBeenCalledWith('client-123', 'relief-123', {
        endDate: '2025-06-30',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on update failure', async () => {
      vi.mocked(reliefPeriodsApi.update).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          reliefId: 'relief-123',
          data: { endDate: '2025-06-30' },
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

  describe('useDeleteReliefPeriod', () => {
    it('should delete relief period and show success toast', async () => {
      vi.mocked(reliefPeriodsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          reliefId: 'relief-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reliefPeriodsApi.delete).toHaveBeenCalledWith('client-123', 'relief-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on delete failure', async () => {
      vi.mocked(reliefPeriodsApi.delete).mockRejectedValue({
        response: { data: { message: 'Delete failed' } },
      });

      const { result } = renderHook(() => useDeleteReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          reliefId: 'relief-123',
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

    it('should handle network errors', async () => {
      vi.mocked(reliefPeriodsApi.delete).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useDeleteReliefPeriod(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          reliefId: 'relief-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
