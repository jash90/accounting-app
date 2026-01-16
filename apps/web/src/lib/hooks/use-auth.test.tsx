import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from './use-auth';
import { authApi } from '../api/endpoints/auth';
import { tokenStorage } from '../auth/token-storage';

vi.mock('../api/endpoints/auth');
vi.mock('../auth/token-storage');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      access_token: 'token',
      refresh_token: 'refresh',
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
    };

    vi.mocked(authApi.login).mockResolvedValue(mockResponse);
    vi.mocked(tokenStorage.setAccessToken).mockImplementation(() => {});
    vi.mocked(tokenStorage.setRefreshToken).mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    result.current.login({ email: 'test@example.com', password: 'password123' });

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('token');
      expect(tokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh');
    });
  });

  it('should logout and clear tokens', () => {
    vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    result.current.logout();

    expect(tokenStorage.clearTokens).toHaveBeenCalled();
  });
});

