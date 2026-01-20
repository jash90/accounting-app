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

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
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

  describe('edge cases', () => {
    it('should handle login failure gracefully', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({ email: 'test@example.com', password: 'wrongpassword' });

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
        // Tokens should not be stored on failure
        expect(tokenStorage.setAccessToken).not.toHaveBeenCalled();
        expect(tokenStorage.setRefreshToken).not.toHaveBeenCalled();
      });
    });

    it('should handle login with empty credentials', async () => {
      const mockError = new Error('Validation failed');
      vi.mocked(authApi.login).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({ email: '', password: '' });

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
        expect(tokenStorage.setAccessToken).not.toHaveBeenCalled();
      });
    });

    it('should handle network errors during login', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(authApi.login).mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({ email: 'test@example.com', password: 'password' });

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
        expect(tokenStorage.setAccessToken).not.toHaveBeenCalled();
      });
    });

    it('should handle multiple concurrent login attempts', async () => {
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

      // Trigger multiple login attempts
      result.current.login({ email: 'test@example.com', password: 'password' });
      result.current.login({ email: 'test@example.com', password: 'password' });

      await waitFor(() => {
        // Should handle gracefully without errors
        expect(authApi.login).toHaveBeenCalled();
      });
    });

    it('should handle logout when not authenticated', () => {
      vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Should not throw when logging out while not authenticated
      expect(() => result.current.logout()).not.toThrow();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });
});

