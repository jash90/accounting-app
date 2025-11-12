import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints/auth';
import { LoginDto, RegisterDto } from '@/types/dtos';
import { tokenStorage } from '../auth/token-storage';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/enums';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    onSuccess: (data) => {
      tokenStorage.setAccessToken(data.access_token);
      tokenStorage.setRefreshToken(data.refresh_token);

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
      tokenStorage.setRefreshToken(data.refresh_token);
      navigate('/admin');
    },
  });

  // Logout
  const logout = () => {
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

