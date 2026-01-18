import { AxiosError } from 'axios';
import { ApiError } from '@/types/api';

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || 'An error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return error instanceof AxiosError && !!error.response?.data;
}

