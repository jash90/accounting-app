import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type ApiErrorResponse = AxiosError<ApiError>;

