import {
  type AuthResponseDto,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
  type UserDto,
} from '@/types/dtos';

import apiClient from '../client';

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

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
    const { data } = await apiClient.post<{ access_token: string }>(
      '/api/auth/refresh',
      refreshToken
    );
    return data;
  },

  getCurrentUser: async (): Promise<UserDto> => {
    const { data } = await apiClient.get<UserDto>('/api/auth/me');
    return data;
  },

  changePassword: async (data: ChangePasswordDto): Promise<{ message: string }> => {
    const { data: response } = await apiClient.patch<{ message: string }>(
      '/api/auth/change-password',
      data
    );
    return response;
  },
};
