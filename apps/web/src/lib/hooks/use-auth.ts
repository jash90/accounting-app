import { useNavigate } from 'react-router-dom';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type LoginDto, type RegisterDto } from '@/types/dtos';
import { UserRole } from '@/types/enums';

import { silentRefreshScheduler } from '../api/client';
import { authApi } from '../api/endpoints/auth';
import { tokenStorage } from '../auth/token-storage';

// NOTE: Refresh tokens are stored in httpOnly cookies by the backend.
// tokenStorage.setRefreshToken() is intentionally a no-op — see token-storage.ts.

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    onSuccess: (data) => {
      tokenStorage.setAccessToken(data.access_token);
      silentRefreshScheduler.schedule();

      // Invalidate auth query to update AuthContext
      queryClient.setQueryData(['auth', 'me'], data.user);

      // Navigate based on role
      switch (data.user.role) {
        case UserRole.ADMIN:
          navigate('/admin');
          break;
        case UserRole.COMPANY_OWNER:
          navigate('/company');
          break;
        case UserRole.EMPLOYEE:
          navigate('/modules');
          break;
      }
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterDto) => authApi.register(userData),
    onSuccess: (data) => {
      tokenStorage.setAccessToken(data.access_token);
      silentRefreshScheduler.schedule();

      // Update auth query to update AuthContext
      queryClient.setQueryData(['auth', 'me'], data.user);

      // Self-registration always creates COMPANY_OWNER
      // Navigate based on actual role (future-proof for admin-created accounts)
      switch (data.user.role) {
        case UserRole.ADMIN:
          navigate('/admin');
          break;
        case UserRole.COMPANY_OWNER:
          navigate('/company');
          break;
        case UserRole.EMPLOYEE:
          navigate('/modules');
          break;
        default:
          navigate('/company');
      }
    },
  });

  // Logout — clear httpOnly cookies on server + local state
  const logout = async () => {
    silentRefreshScheduler.cancel();
    try {
      // Tell backend to clear httpOnly cookies
      await authApi.logout();
    } catch {
      // Proceed with local cleanup even if server request fails
    }
    tokenStorage.clearTokens();
    queryClient.clear(); // Clear all cached data
    navigate('/login');
  };

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isPending: loginMutation.isPending || registerMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  };
};
