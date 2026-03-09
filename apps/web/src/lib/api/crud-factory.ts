import type { PaginatedResponse } from '@/types/api';

import apiClient from './client';

/**
 * Generates the 5 standard REST CRUD methods (getAll, getById, create, update, delete)
 * for a given base URL. Spread the result into an API object and add extra methods.
 *
 * @example
 * export const tasksApi = {
 *   ...createCrudApi<TaskResponseDto, CreateTaskDto, UpdateTaskDto, TaskFiltersDto>(BASE_URL),
 *   getKanban: async () => { ... },
 * };
 */
/**
 * Creates a standard blob (CSV/PDF) export function for a given URL.
 * The returned function passes filters as query params and expects a binary response.
 *
 * @example
 * exportCsv: createBlobExport(`${BASE_URL}/export`),
 */
export function createBlobExport<TFilters = unknown>(url: string) {
  return async (filters?: TFilters): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(url, { params: filters, responseType: 'blob' });
    return data;
  };
}

export function createCrudApi<TResponse, TCreate, TUpdate, TFilters = unknown>(
  baseUrl: string
): {
  getAll(filters?: TFilters): Promise<PaginatedResponse<TResponse>>;
  getById(id: string): Promise<TResponse>;
  create(dto: TCreate): Promise<TResponse>;
  update(id: string, dto: TUpdate): Promise<TResponse>;
  delete(id: string): Promise<void>;
} {
  return {
    getAll: async (filters?: TFilters) => {
      const { data } = await apiClient.get<PaginatedResponse<TResponse>>(baseUrl, {
        params: filters,
      });
      return data;
    },

    getById: async (id: string) => {
      const { data } = await apiClient.get<TResponse>(`${baseUrl}/${id}`);
      return data;
    },

    create: async (dto: TCreate) => {
      const { data } = await apiClient.post<TResponse>(baseUrl, dto);
      return data;
    },

    update: async (id: string, dto: TUpdate) => {
      const { data } = await apiClient.patch<TResponse>(`${baseUrl}/${id}`, dto);
      return data;
    },

    delete: async (id: string) => {
      await apiClient.delete(`${baseUrl}/${id}`);
    },
  };
}
