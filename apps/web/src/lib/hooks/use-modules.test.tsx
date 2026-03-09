import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCreateModule,
  useDeleteModule,
  useModule,
  useModules,
  useUpdateModule,
} from './use-modules';
import { modulesApi } from '../api/endpoints/modules';

vi.mock('../api/endpoints/modules');
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

const mockModule = {
  id: 'mod-1',
  name: 'Tasks',
  slug: 'tasks',
  description: 'Task management module',
  isActive: true,
};

describe('use-modules hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useModules', () => {
    it('should fetch all modules', async () => {
      vi.mocked(modulesApi.getAll).mockResolvedValue([mockModule] as any);

      const { result } = renderHook(() => useModules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockModule]);
      expect(modulesApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useModule', () => {
    it('should fetch a single module by identifier', async () => {
      vi.mocked(modulesApi.getByIdentifier).mockResolvedValue(mockModule as any);

      const { result } = renderHook(() => useModule('tasks'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockModule);
      expect(modulesApi.getByIdentifier).toHaveBeenCalledWith('tasks');
    });

    it('should not fetch when identifier is empty', () => {
      const { result } = renderHook(() => useModule(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(modulesApi.getByIdentifier).not.toHaveBeenCalled();
    });
  });

  describe('useCreateModule', () => {
    it('should create a module and show success toast', async () => {
      vi.mocked(modulesApi.create).mockResolvedValue(mockModule as any);

      const { result } = renderHook(() => useCreateModule(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Tasks', slug: 'tasks' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(modulesApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUpdateModule', () => {
    it('should update a module and show success toast', async () => {
      vi.mocked(modulesApi.update).mockResolvedValue({ ...mockModule, name: 'Updated' } as any);

      const { result } = renderHook(() => useUpdateModule(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'mod-1', data: { name: 'Updated' } as any });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(modulesApi.update).toHaveBeenCalledWith('mod-1', { name: 'Updated' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteModule', () => {
    it('should delete a module and show success toast', async () => {
      vi.mocked(modulesApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteModule(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('mod-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(modulesApi.delete).toHaveBeenCalledWith('mod-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });
});
