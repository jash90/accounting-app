import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import { offerTemplatesApi } from '../api/endpoints/offers';
import {
  useOfferTemplateContentBlocks,
  useUpdateOfferTemplateContentBlocks,
} from './use-template-content-blocks';

vi.mock('../api/endpoints/offers');
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
    { id: 'block-1', type: 'heading', content: 'Offer Title' },
    { id: 'block-2', type: 'paragraph', content: 'Offer details' },
  ],
  name: 'Standard Offer',
};

describe('use-template-content-blocks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useOfferTemplateContentBlocks', () => {
    it('should fetch content blocks for an offer template', async () => {
      vi.mocked(offerTemplatesApi.getContentBlocks).mockResolvedValue(mockContentBlocks as any);

      const { result } = renderHook(() => useOfferTemplateContentBlocks('offer-tpl-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContentBlocks);
      expect(offerTemplatesApi.getContentBlocks).toHaveBeenCalledWith('offer-tpl-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useOfferTemplateContentBlocks(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(offerTemplatesApi.getContentBlocks).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateOfferTemplateContentBlocks', () => {
    it('should update content blocks and show success toast', async () => {
      vi.mocked(offerTemplatesApi.updateContentBlocks).mockResolvedValue(mockContentBlocks as any);

      const { result } = renderHook(() => useUpdateOfferTemplateContentBlocks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-tpl-1',
          data: { contentBlocks: mockContentBlocks.contentBlocks as any },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offerTemplatesApi.updateContentBlocks).toHaveBeenCalledWith('offer-tpl-1', {
        contentBlocks: mockContentBlocks.contentBlocks,
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offerTemplatesApi.updateContentBlocks).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateOfferTemplateContentBlocks(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'offer-tpl-1', data: { contentBlocks: [] as any } });
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
