import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export type ApiErrorResponse = AxiosError<ApiError>;

