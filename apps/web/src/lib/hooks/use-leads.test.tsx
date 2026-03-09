import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useConvertLeadToClient,
  useCreateLead,
  useDeleteLead,
  useLead,
  useLeadAssignees,
  useLeads,
  useLeadStatistics,
} from './use-leads';
import { leadsApi } from '../api/endpoints/offers';

// Mock the API modules
vi.mock('../api/endpoints/offers');
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

const mockLead = {
  id: 'lead-123',
  name: 'Test Lead',
  email: 'lead@test.com',
  status: 'NEW',
  source: 'WEBSITE',
};

const mockPaginatedResponse = {
  data: [mockLead],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockStatistics = {
  total: 20,
  byStatus: { NEW: 5, CONTACTED: 8, QUALIFIED: 4, CONVERTED: 3 },
};

const mockAssignees = [
  { id: 'user-1', name: 'User One' },
  { id: 'user-2', name: 'User Two' },
];

describe('use-leads hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Query Hooks
  // ========================================

  describe('useLeads', () => {
    it('should fetch leads', async () => {
      vi.mocked(leadsApi.getAll).mockResolvedValue(mockPaginatedResponse as any);

      const { result } = renderHook(() => useLeads(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
    });

    it('should pass filters to API', async () => {
      vi.mocked(leadsApi.getAll).mockResolvedValue(mockPaginatedResponse as any);
      const filters = { status: 'NEW' as const, page: 2 };

      const { result } = renderHook(() => useLeads(filters as any), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(leadsApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useLead', () => {
    it('should fetch single lead', async () => {
      vi.mocked(leadsApi.getById).mockResolvedValue(mockLead as any);

      const { result } = renderHook(() => useLead('lead-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLead);
      expect(leadsApi.getById).toHaveBeenCalledWith('lead-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useLead(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(leadsApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useLeadStatistics', () => {
    it('should fetch lead statistics', async () => {
      vi.mocked(leadsApi.getStatistics).mockResolvedValue(mockStatistics as any);

      const { result } = renderHook(() => useLeadStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStatistics);
    });
  });

  describe('useLeadAssignees', () => {
    it('should fetch lead assignees', async () => {
      vi.mocked(leadsApi.getAssignees).mockResolvedValue(mockAssignees as any);

      const { result } = renderHook(() => useLeadAssignees(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAssignees);
    });
  });

  // ========================================
  // Mutation Hooks
  // ========================================

  describe('useCreateLead', () => {
    it('should create lead and show success toast', async () => {
      vi.mocked(leadsApi.create).mockResolvedValue(mockLead as any);

      const { result } = renderHook(() => useCreateLead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Lead', email: 'new@test.com' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteLead', () => {
    it('should delete lead and show success toast', async () => {
      vi.mocked(leadsApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteLead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('lead-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(leadsApi.delete).toHaveBeenCalledWith('lead-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useConvertLeadToClient', () => {
    it('should convert lead to client and show success toast', async () => {
      vi.mocked(leadsApi.convertToClient).mockResolvedValue({
        clientId: 'client-123',
        message: 'Lead converted successfully',
      });

      const { result } = renderHook(() => useConvertLeadToClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'lead-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(leadsApi.convertToClient).toHaveBeenCalledWith('lead-123', undefined);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on conversion failure', async () => {
      vi.mocked(leadsApi.convertToClient).mockRejectedValue({
        response: { data: { message: 'Conversion failed' } },
      });

      const { result } = renderHook(() => useConvertLeadToClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'lead-123' });
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
});
