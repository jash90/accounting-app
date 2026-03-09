import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocumentTemplates,
  useDownloadDocumentPdf,
  useGeneratedDocuments,
  useGenerateDocument,
  useUpdateDocumentTemplate,
} from './use-documents';
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

const mockTemplate = {
  id: 'tpl-1',
  name: 'Invoice Template',
  category: 'invoice',
  isActive: true,
  companyId: 'company-1',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockGeneratedDoc = {
  id: 'doc-1',
  name: 'Invoice #001',
  templateId: 'tpl-1',
  createdAt: '2024-01-15T00:00:00Z',
};

describe('use-documents hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  describe('useDocumentTemplates', () => {
    it('should fetch document templates', async () => {
      vi.mocked(documentsApi.getTemplates).mockResolvedValue([mockTemplate] as any);

      const { result } = renderHook(() => useDocumentTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockTemplate]);
      expect(documentsApi.getTemplates).toHaveBeenCalled();
    });
  });

  describe('useGeneratedDocuments', () => {
    it('should fetch generated documents', async () => {
      vi.mocked(documentsApi.getGeneratedDocuments).mockResolvedValue([mockGeneratedDoc] as any);

      const { result } = renderHook(() => useGeneratedDocuments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockGeneratedDoc]);
      expect(documentsApi.getGeneratedDocuments).toHaveBeenCalled();
    });
  });

  describe('useCreateDocumentTemplate', () => {
    it('should create a document template', async () => {
      vi.mocked(documentsApi.createTemplate).mockResolvedValue(mockTemplate as any);

      const { result } = renderHook(() => useCreateDocumentTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Invoice Template', category: 'invoice' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.createTemplate).toHaveBeenCalled();
    });
  });

  describe('useUpdateDocumentTemplate', () => {
    it('should update a document template', async () => {
      vi.mocked(documentsApi.updateTemplate).mockResolvedValue({
        ...mockTemplate,
        name: 'Updated',
      } as any);

      const { result } = renderHook(() => useUpdateDocumentTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'tpl-1', data: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.updateTemplate).toHaveBeenCalledWith('tpl-1', { name: 'Updated' });
    });
  });

  describe('useDeleteDocumentTemplate', () => {
    it('should delete a document template', async () => {
      vi.mocked(documentsApi.deleteTemplate).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteDocumentTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('tpl-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.deleteTemplate).toHaveBeenCalledWith('tpl-1', expect.anything());
    });
  });

  describe('useGenerateDocument', () => {
    it('should generate a document', async () => {
      vi.mocked(documentsApi.generateDocument).mockResolvedValue(mockGeneratedDoc as any);

      const { result } = renderHook(() => useGenerateDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ templateId: 'tpl-1', name: 'Invoice #001' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.generateDocument).toHaveBeenCalledWith(
        { templateId: 'tpl-1', name: 'Invoice #001' },
        expect.anything()
      );
    });
  });

  describe('useDownloadDocumentPdf', () => {
    it('should download a PDF', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      vi.mocked(documentsApi.downloadPdf).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useDownloadDocumentPdf(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('doc-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(documentsApi.downloadPdf).toHaveBeenCalledWith('doc-1', expect.anything());
    });
  });
});
