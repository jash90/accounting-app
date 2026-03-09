import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useDocumentTemplateContentBlocks,
  useUpdateDocumentTemplateContentBlocks,
} from './use-document-template-content-blocks';
import { documentsApi } from '../api/endpoints/documents';

vi.mock('../api/endpoints/documents');
vi.mock('@/components/ui/use-toast');

const mockToast = vi.fn();

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

const mockContentBlocks = {
  contentBlocks: [
    { id: 'block-1', type: 'heading', content: 'Title' },
    { id: 'block-2', type: 'paragraph', content: 'Body text' },
  ],
  documentSourceType: 'blocks' as const,
  name: 'Invoice Template',
};

describe('use-document-template-content-blocks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useDocumentTemplateContentBlocks', () => {
    it('should fetch content blocks for a template', async () => {
      vi.mocked(documentsApi.getContentBlocks).mockResolvedValue(mockContentBlocks as any);

      const { result } = renderHook(() => useDocumentTemplateContentBlocks('tpl-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContentBlocks);
      expect(documentsApi.getContentBlocks).toHaveBeenCalledWith('tpl-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDocumentTemplateContentBlocks(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(documentsApi.getContentBlocks).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateDocumentTemplateContentBlocks', () => {
    it('should update content blocks and show success toast', async () => {
      vi.mocked(documentsApi.updateContentBlocks).mockResolvedValue(mockContentBlocks as any);

      const { result } = renderHook(() => useUpdateDocumentTemplateContentBlocks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'tpl-1',
          data: { contentBlocks: mockContentBlocks.contentBlocks as any },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.updateContentBlocks).toHaveBeenCalledWith('tpl-1', {
        contentBlocks: mockContentBlocks.contentBlocks,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(documentsApi.updateContentBlocks).mockRejectedValue({
        response: { data: { message: 'Save failed' } },
      });

      const { result } = renderHook(() => useUpdateDocumentTemplateContentBlocks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'tpl-1', data: { contentBlocks: [] } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Błąd', variant: 'destructive' })
      );
    });
  });
});
