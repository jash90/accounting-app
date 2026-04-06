import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useClientSuspensions,
  useCreateSuspension,
  useDeleteSuspension,
  useSuspension,
  useUpdateSuspension,
} from './use-suspensions';
import { suspensionsApi } from '../api/endpoints/suspensions';

// Mock the API modules
vi.mock('../api/endpoints/suspensions');
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

const mockSuspension = {
  id: 'susp-123',
  clientId: 'client-123',
  clientName: 'Test Client',
  companyId: 'company-123',
  startDate: '2024-01-01',
  endDate: '2024-06-30',
  reason: 'Test suspension',
  createdById: 'user-123',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('use-suspensions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Query Hooks
  // ========================================

  describe('useClientSuspensions', () => {
    it('should fetch suspensions for a client', async () => {
      vi.mocked(suspensionsApi.getAll).mockResolvedValue([mockSuspension]);

      const { result } = renderHook(() => useClientSuspensions('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockSuspension]);
      expect(suspensionsApi.getAll).toHaveBeenCalledWith('client-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useClientSuspensions(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(suspensionsApi.getAll).not.toHaveBeenCalled();
    });

    it('should return empty array when no suspensions exist', async () => {
      vi.mocked(suspensionsApi.getAll).mockResolvedValue([]);

      const { result } = renderHook(() => useClientSuspensions('client-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useSuspension', () => {
    it('should fetch single suspension', async () => {
      vi.mocked(suspensionsApi.getById).mockResolvedValue(mockSuspension);

      const { result } = renderHook(() => useSuspension('client-123', 'susp-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSuspension);
      expect(suspensionsApi.getById).toHaveBeenCalledWith('client-123', 'susp-123');
    });

    it('should not fetch when clientId is empty', async () => {
      const { result } = renderHook(() => useSuspension('', 'susp-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(suspensionsApi.getById).not.toHaveBeenCalled();
    });

    it('should not fetch when suspensionId is empty', async () => {
      const { result } = renderHook(() => useSuspension('client-123', ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(suspensionsApi.getById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Mutation Hooks
  // ========================================

  describe('useCreateSuspension', () => {
    it('should create suspension and show success toast', async () => {
      vi.mocked(suspensionsApi.create).mockResolvedValue(mockSuspension);

      const { result } = renderHook(() => useCreateSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          data: { startDate: '2024-01-01', reason: 'Test' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(suspensionsApi.create).toHaveBeenCalledWith('client-123', {
        startDate: '2024-01-01',
        reason: 'Test',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast and rollback on failure', async () => {
      vi.mocked(suspensionsApi.create).mockRejectedValue({
        response: { data: { message: 'Creation failed' } },
      });

      const { result } = renderHook(() => useCreateSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          data: { startDate: '2024-01-01' },
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

  describe('useUpdateSuspension', () => {
    it('should update suspension and show success toast', async () => {
      vi.mocked(suspensionsApi.update).mockResolvedValue({
        ...mockSuspension,
        endDate: '2024-12-31',
      });

      const { result } = renderHook(() => useUpdateSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          suspensionId: 'susp-123',
          data: { endDate: '2024-12-31' },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(suspensionsApi.update).toHaveBeenCalledWith('client-123', 'susp-123', {
        endDate: '2024-12-31',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on update failure', async () => {
      vi.mocked(suspensionsApi.update).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          suspensionId: 'susp-123',
          data: { endDate: '2024-12-31' },
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

  describe('useDeleteSuspension', () => {
    it('should delete suspension and show success toast', async () => {
      vi.mocked(suspensionsApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          suspensionId: 'susp-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(suspensionsApi.delete).toHaveBeenCalledWith('client-123', 'susp-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on delete failure', async () => {
      vi.mocked(suspensionsApi.delete).mockRejectedValue({
        response: { data: { message: 'Delete failed' } },
      });

      const { result } = renderHook(() => useDeleteSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          suspensionId: 'susp-123',
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
      vi.mocked(suspensionsApi.delete).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useDeleteSuspension(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          clientId: 'client-123',
          suspensionId: 'susp-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
