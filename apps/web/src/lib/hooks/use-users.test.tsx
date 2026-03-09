import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import { usersApi } from '../api/endpoints/users';
import {
  useAvailableCompanyOwners,
  useCreateUser,
  useDeleteUser,
  useUser,
  useUsers,
} from './use-users';

vi.mock('../api/endpoints/users');
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

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
};

describe('use-users hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useUsers', () => {
    it('should fetch all users', async () => {
      vi.mocked(usersApi.getAll).mockResolvedValue([mockUser] as any);

      const { result } = renderHook(() => useUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockUser]);
      expect(usersApi.getAll).toHaveBeenCalled();
    });
  });

  describe('useUser', () => {
    it('should fetch a single user by id', async () => {
      vi.mocked(usersApi.getById).mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useUser('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
      expect(usersApi.getById).toHaveBeenCalledWith('user-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useUser(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(usersApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateUser', () => {
    it('should create a user and show success toast', async () => {
      vi.mocked(usersApi.create).mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(usersApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteUser', () => {
    it('should delete a user and show success toast', async () => {
      vi.mocked(usersApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('user-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(usersApi.delete).toHaveBeenCalledWith('user-1');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useAvailableCompanyOwners', () => {
    it('should fetch available company owners', async () => {
      const mockOwners = [{ ...mockUser, role: 'COMPANY_OWNER' }];
      vi.mocked(usersApi.getAvailableOwners).mockResolvedValue(mockOwners as any);

      const { result } = renderHook(() => useAvailableCompanyOwners(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOwners);
      expect(usersApi.getAvailableOwners).toHaveBeenCalled();
    });
  });
});
