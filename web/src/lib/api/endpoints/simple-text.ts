import apiClient from '../client';
import { CreateSimpleTextDto, UpdateSimpleTextDto, SimpleTextResponseDto } from '@/types/dtos';

export const simpleTextApi = {
  getAll: async (): Promise<SimpleTextResponseDto[]> => {
    const { data } = await apiClient.get<SimpleTextResponseDto[]>('/api/modules/simple-text');
    return data;
  },

  getById: async (id: string): Promise<SimpleTextResponseDto> => {
    const { data } = await apiClient.get<SimpleTextResponseDto>(`/api/modules/simple-text/${id}`);
    return data;
  },

  create: async (textData: CreateSimpleTextDto): Promise<SimpleTextResponseDto> => {
    const { data } = await apiClient.post<SimpleTextResponseDto>('/api/modules/simple-text', textData);
    return data;
  },

  update: async (id: string, textData: UpdateSimpleTextDto): Promise<SimpleTextResponseDto> => {
    const { data } = await apiClient.patch<SimpleTextResponseDto>(`/api/modules/simple-text/${id}`, textData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/modules/simple-text/${id}`);
  },
};

