import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployee,
  useEmployees,
  useUpdateEmployee,
} from './use-employees';
import { employeesApi } from '../api/endpoints/employees';

vi.mock('../api/endpoints/employees');
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

const mockEmployee = {
  id: 'emp-1',
  email: 'employee@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  role: 'EMPLOYEE',
  isActive: true,
};

describe('use-employees hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useEmployees', () => {
    it('should fetch all employees', async () => {
      vi.mocked(employeesApi.getAll).mockResolvedValue([mockEmployee] as any);

      const { result } = renderHook(() => useEmployees(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockEmployee]);
      expect(employeesApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useEmployee', () => {
    it('should fetch a single employee by id', async () => {
      vi.mocked(employeesApi.getById).mockResolvedValue(mockEmployee as any);

      const { result } = renderHook(() => useEmployee('emp-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmployee);
      expect(employeesApi.getById).toHaveBeenCalledWith('emp-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useEmployee(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(employeesApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateEmployee', () => {
    it('should create an employee and show success toast', async () => {
      vi.mocked(employeesApi.create).mockResolvedValue(mockEmployee as any);

      const { result } = renderHook(() => useCreateEmployee(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          email: 'new@example.com',
          firstName: 'Anna',
          lastName: 'Nowak',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(employeesApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(employeesApi.create).mockRejectedValue({
        response: { data: { message: 'Email already exists' } },
      });

      const { result } = renderHook(() => useCreateEmployee(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ email: 'dup@example.com' } as any);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });

  describe('useUpdateEmployee', () => {
    it('should update an employee and show success toast', async () => {
      vi.mocked(employeesApi.update).mockResolvedValue({
        ...mockEmployee,
        firstName: 'Updated',
      } as any);

      const { result } = renderHook(() => useUpdateEmployee(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'emp-1', data: { firstName: 'Updated' } as any });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(employeesApi.update).toHaveBeenCalledWith('emp-1', { firstName: 'Updated' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteEmployee', () => {
    it('should delete an employee and show success toast', async () => {
      vi.mocked(employeesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteEmployee(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('emp-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(employeesApi.delete).toHaveBeenCalledWith('emp-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });
});
