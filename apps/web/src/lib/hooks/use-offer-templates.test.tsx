import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCreateOfferTemplate,
  useDefaultOfferTemplate,
  useDeleteOfferTemplate,
  useDownloadOfferTemplateFile,
  useOfferTemplate,
  useOfferTemplates,
  useUploadOfferTemplateFile,
} from './use-offer-templates';
import { offerTemplatesApi } from '../api/endpoints/offers';
import { downloadBlob } from '../utils/download';

// Mock the API modules
vi.mock('../api/endpoints/offers');
vi.mock('@/components/ui/use-toast');
vi.mock('../utils/download');

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

const mockTemplate = {
  id: 'tpl-123',
  name: 'Test Template',
  description: 'A test template',
  isDefault: false,
  createdAt: '2024-01-15T09:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockTemplate],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

describe('use-offer-templates hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Query Hooks
  // ========================================

  describe('useOfferTemplates', () => {
    it('should fetch offer templates', async () => {
      vi.mocked(offerTemplatesApi.getAll).mockResolvedValue(mockPaginatedResponse as any);

      const { result } = renderHook(() => useOfferTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
    });

    it('should pass filters to API', async () => {
      vi.mocked(offerTemplatesApi.getAll).mockResolvedValue(mockPaginatedResponse as any);
      const filters = { page: 2, search: 'test' };

      const { result } = renderHook(() => useOfferTemplates(filters as any), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offerTemplatesApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useOfferTemplate', () => {
    it('should fetch single offer template', async () => {
      vi.mocked(offerTemplatesApi.getById).mockResolvedValue(mockTemplate as any);

      const { result } = renderHook(() => useOfferTemplate('tpl-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplate);
      expect(offerTemplatesApi.getById).toHaveBeenCalledWith('tpl-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useOfferTemplate(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(offerTemplatesApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useDefaultOfferTemplate', () => {
    it('should fetch default offer template', async () => {
      vi.mocked(offerTemplatesApi.getDefault).mockResolvedValue(mockTemplate as any);

      const { result } = renderHook(() => useDefaultOfferTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplate);
    });

    it('should return null when no default template exists', async () => {
      vi.mocked(offerTemplatesApi.getDefault).mockResolvedValue(null);

      const { result } = renderHook(() => useDefaultOfferTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  // ========================================
  // Mutation Hooks
  // ========================================

  describe('useCreateOfferTemplate', () => {
    it('should create template and show success toast', async () => {
      vi.mocked(offerTemplatesApi.create).mockResolvedValue(mockTemplate as any);

      const { result } = renderHook(() => useCreateOfferTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Template' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteOfferTemplate', () => {
    it('should delete template and show success toast', async () => {
      vi.mocked(offerTemplatesApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteOfferTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('tpl-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offerTemplatesApi.delete).toHaveBeenCalledWith('tpl-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUploadOfferTemplateFile', () => {
    it('should upload template file and show success toast', async () => {
      vi.mocked(offerTemplatesApi.uploadTemplate).mockResolvedValue(mockTemplate as any);
      const file = new File(['test'], 'template.docx');

      const { result } = renderHook(() => useUploadOfferTemplateFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'tpl-123', file });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offerTemplatesApi.uploadTemplate).toHaveBeenCalledWith('tpl-123', file);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDownloadOfferTemplateFile', () => {
    it('should download template file', async () => {
      const mockBlob = new Blob(['file content']);
      vi.mocked(offerTemplatesApi.downloadTemplate).mockResolvedValue(mockBlob);
      vi.mocked(downloadBlob).mockReturnValue({ success: true } as any);

      const { result } = renderHook(() => useDownloadOfferTemplateFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'tpl-123', filename: 'template.docx' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offerTemplatesApi.downloadTemplate).toHaveBeenCalledWith('tpl-123');
      expect(downloadBlob).toHaveBeenCalledWith(mockBlob, 'template.docx');
    });

    it('should show error toast on download failure', async () => {
      vi.mocked(offerTemplatesApi.downloadTemplate).mockRejectedValue({
        response: { data: { message: 'Download failed' } },
      });

      const { result } = renderHook(() => useDownloadOfferTemplateFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'tpl-123', filename: 'template.docx' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Błąd',
          variant: 'destructive',
        })
      );
    });
  });
});
