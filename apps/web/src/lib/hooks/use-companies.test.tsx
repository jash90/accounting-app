import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCompanies,
  useCompany,
  useCompanyAssignedModules,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from './use-companies';
import { companiesApi } from '../api/endpoints/companies';

vi.mock('../api/endpoints/companies');
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

const mockCompany = {
  id: 'company-1',
  name: 'Test Company',
  nip: '1234567890',
  isActive: true,
};

describe('use-companies hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useCompanies', () => {
    it('should fetch all companies', async () => {
      vi.mocked(companiesApi.getAll).mockResolvedValue([mockCompany] as any);

      const { result } = renderHook(() => useCompanies(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockCompany]);
      expect(companiesApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useCompany', () => {
    it('should fetch a single company by id', async () => {
      vi.mocked(companiesApi.getById).mockResolvedValue(mockCompany as any);

      const { result } = renderHook(() => useCompany('company-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCompany);
      expect(companiesApi.getById).toHaveBeenCalledWith('company-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCompany(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(companiesApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCompany', () => {
    it('should create a company and show success toast', async () => {
      vi.mocked(companiesApi.create).mockResolvedValue(mockCompany as any);

      const { result } = renderHook(() => useCreateCompany(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Test Company' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(companiesApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(companiesApi.create).mockRejectedValue({
        response: { data: { message: 'Validation failed' } },
      });

      const { result } = renderHook(() => useCreateCompany(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: '' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateCompany', () => {
    it('should update a company and show success toast', async () => {
      vi.mocked(companiesApi.update).mockResolvedValue({ ...mockCompany, name: 'Updated' } as any);

      const { result } = renderHook(() => useUpdateCompany(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'company-1', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(companiesApi.update).toHaveBeenCalledWith('company-1', { name: 'Updated' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteCompany', () => {
    it('should delete a company and show success toast', async () => {
      vi.mocked(companiesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCompany(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('company-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(companiesApi.delete).toHaveBeenCalledWith('company-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useCompanyAssignedModules', () => {
    it('should fetch company modules', async () => {
      const mockModules = [{ id: 'mod-1', moduleSlug: 'tasks' }];
      vi.mocked(companiesApi.getCompanyModules).mockResolvedValue(mockModules as any);

      const { result } = renderHook(() => useCompanyAssignedModules('company-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockModules);
      expect(companiesApi.getCompanyModules).toHaveBeenCalledWith('company-1');
    });

    it('should not fetch when companyId is empty', () => {
      const { result } = renderHook(() => useCompanyAssignedModules(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(companiesApi.getCompanyModules).not.toHaveBeenCalled();
    });
  });
});
