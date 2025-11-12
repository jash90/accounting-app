import apiClient from '../client';
import { LoginDto, RegisterDto, AuthResponseDto, RefreshTokenDto, UserDto } from '@/types/dtos';

export const authApi = {
  login: async (credentials: LoginDto): Promise<AuthResponseDto> => {
    const { data } = await apiClient.post<AuthResponseDto>('/api/auth/login', credentials);
    return data;
  },

  register: async (userData: RegisterDto): Promise<AuthResponseDto> => {
    const { data } = await apiClient.post<AuthResponseDto>('/api/auth/register', userData);
    return data;
  },

  refresh: async (refreshToken: RefreshTokenDto): Promise<{ access_token: string }> => {
    const { data } = await apiClient.post<{ access_token: string }>('/api/auth/refresh', refreshToken);
    return data;
  },

  getCurrentUser: async (): Promise<UserDto> => {
    const { data } = await apiClient.get<UserDto>('/api/auth/me');
    return data;
  },
};
