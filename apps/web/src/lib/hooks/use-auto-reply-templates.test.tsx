import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAutoReplyTemplates,
  useCreateAutoReplyTemplate,
  useDeleteAutoReplyTemplate,
  useToggleAutoReplyTemplate,
  useUpdateAutoReplyTemplate,
} from './use-auto-reply-templates';
import apiClient from '../api/client';

vi.mock('../api/client');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockTemplate = {
  id: 'art-1',
  name: 'Welcome Reply',
  isActive: true,
  triggerKeywords: ['hello', 'hi'],
  keywordMatchMode: 'any',
  matchSubjectOnly: false,
  bodyTemplate: 'Thank you for your message.',
  tone: 'professional',
  matchCount: 5,
};

describe('use-auto-reply-templates hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAutoReplyTemplates', () => {
    it('should fetch auto-reply templates', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockTemplate] });

      const { result } = renderHook(() => useAutoReplyTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockTemplate]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/modules/email-client/auto-reply-templates');
    });
  });

  describe('useCreateAutoReplyTemplate', () => {
    it('should create an auto-reply template', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTemplate });

      const { result } = renderHook(() => useCreateAutoReplyTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Welcome Reply', bodyTemplate: 'Thank you.' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/modules/email-client/auto-reply-templates',
        { name: 'Welcome Reply', bodyTemplate: 'Thank you.' }
      );
    });
  });

  describe('useUpdateAutoReplyTemplate', () => {
    it('should update an auto-reply template', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockTemplate, name: 'Updated' } });

      const { result } = renderHook(() => useUpdateAutoReplyTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'art-1', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/modules/email-client/auto-reply-templates/art-1',
        { name: 'Updated' }
      );
    });
  });

  describe('useDeleteAutoReplyTemplate', () => {
    it('should delete an auto-reply template', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useDeleteAutoReplyTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('art-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/api/modules/email-client/auto-reply-templates/art-1'
      );
    });
  });

  describe('useToggleAutoReplyTemplate', () => {
    it('should toggle template active status', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...mockTemplate, isActive: false } });

      const { result } = renderHook(() => useToggleAutoReplyTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'art-1', isActive: false });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/modules/email-client/auto-reply-templates/art-1',
        { isActive: false }
      );
    });
  });
});
