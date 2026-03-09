import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCreateOffer,
  useDeleteOffer,
  useDownloadOfferDocument,
  useDuplicateOffer,
  useExportOffers,
  useGenerateOfferDocument,
  useOffer,
  useOfferActivities,
  useOffers,
  useOffersDashboardStatistics,
  useOfferStandardPlaceholders,
  useOfferStatistics,
  useSendOffer,
  useUpdateOffer,
  useUpdateOfferStatus,
} from './use-offers';
import { leadsApi, offersApi } from '../api/endpoints/offers';

// Mock the API modules
vi.mock('../api/endpoints/offers');
vi.mock('@/components/ui/use-toast');
vi.mock('../utils/optimistic-offers-updates', () => ({
  invalidateOfferQueries: vi.fn(),
  isOfferListQuery: vi.fn(() => false),
  isLeadListQuery: vi.fn(() => false),
  isOfferTemplateListQuery: vi.fn(() => false),
  clearOptimisticUpdateTrackers: vi.fn(),
  OFFERS_CACHE_TIMES: { list: 30000, statistics: 60000, placeholders: 300000, templates: 300000 },
  performOptimisticOfferUpdate: vi.fn().mockResolvedValue({}),
  rollbackOptimisticOfferUpdate: vi.fn(),
}));
vi.mock('../utils/download', () => ({
  downloadBlob: vi.fn(() => ({ success: true })),
}));

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

const mockOffer = {
  id: 'offer-123',
  title: 'Test Offer',
  description: 'Test description',
  status: 'DRAFT',
  vatRate: 23,
  totalNet: 1000,
  totalGross: 1230,
  clientId: 'client-123',
  companyId: 'company-123',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockPaginatedResponse = {
  data: [mockOffer],
  meta: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockStatistics = {
  total: 20,
  draft: 5,
  sent: 8,
  accepted: 4,
  rejected: 3,
  totalValue: 50000,
};

const mockActivities = [
  {
    id: 'activity-1',
    offerId: 'offer-123',
    type: 'STATUS_CHANGE',
    createdAt: '2026-03-01T00:00:00Z',
  },
];

describe('use-offers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // Offer Query Hooks
  // ========================================

  describe('useOffers', () => {
    it('should fetch offers', async () => {
      vi.mocked(offersApi.getAll).mockResolvedValue(mockPaginatedResponse as any);

      const { result } = renderHook(() => useOffers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaginatedResponse);
    });

    it('should pass filters to API', async () => {
      vi.mocked(offersApi.getAll).mockResolvedValue(mockPaginatedResponse as any);
      const filters = { status: 'DRAFT' as any, page: 2 };

      const { result } = renderHook(() => useOffers(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.getAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('useOffer', () => {
    it('should fetch single offer', async () => {
      vi.mocked(offersApi.getById).mockResolvedValue(mockOffer as any);

      const { result } = renderHook(() => useOffer('offer-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOffer);
      expect(offersApi.getById).toHaveBeenCalledWith('offer-123');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useOffer(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(offersApi.getById).not.toHaveBeenCalled();
    });
  });

  describe('useOfferActivities', () => {
    it('should fetch offer activities', async () => {
      vi.mocked(offersApi.getActivities).mockResolvedValue(mockActivities as any);

      const { result } = renderHook(() => useOfferActivities('offer-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActivities);
      expect(offersApi.getActivities).toHaveBeenCalledWith('offer-123');
    });

    it('should not fetch when offerId is empty', async () => {
      const { result } = renderHook(() => useOfferActivities(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(offersApi.getActivities).not.toHaveBeenCalled();
    });
  });

  describe('useOfferStatistics', () => {
    it('should fetch offer statistics', async () => {
      vi.mocked(offersApi.getStatistics).mockResolvedValue(mockStatistics as any);

      const { result } = renderHook(() => useOfferStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStatistics);
      expect(offersApi.getStatistics).toHaveBeenCalled();
    });
  });

  describe('useOffersDashboardStatistics', () => {
    it('should fetch offer and lead statistics in parallel', async () => {
      const mockLeadStats = { total: 15, new: 5, contacted: 4, qualified: 3, converted: 3 };
      vi.mocked(offersApi.getStatistics).mockResolvedValue(mockStatistics as any);
      vi.mocked(leadsApi.getStatistics).mockResolvedValue(mockLeadStats as any);

      const { result } = renderHook(() => useOffersDashboardStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      expect(result.current.offerStats).toEqual(mockStatistics);
      expect(result.current.leadStats).toEqual(mockLeadStats);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('useOfferStandardPlaceholders', () => {
    it('should fetch standard placeholders', async () => {
      const mockPlaceholders = { placeholders: [{ key: 'company_name', label: 'Nazwa firmy' }] };
      vi.mocked(offersApi.getStandardPlaceholders).mockResolvedValue(mockPlaceholders as any);

      const { result } = renderHook(() => useOfferStandardPlaceholders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlaceholders);
    });
  });

  // ========================================
  // Offer Mutation Hooks
  // ========================================

  describe('useCreateOffer', () => {
    it('should create offer and show success toast', async () => {
      vi.mocked(offersApi.create).mockResolvedValue(mockOffer as any);

      const { result } = renderHook(() => useCreateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          title: 'New Offer',
          clientId: 'client-123',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.create).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offersApi.create).mockRejectedValue({
        response: { data: { message: 'Validation failed' } },
      });

      const { result } = renderHook(() => useCreateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New Offer' } as any);
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

  describe('useUpdateOffer', () => {
    it('should update offer and show success toast', async () => {
      vi.mocked(offersApi.update).mockResolvedValue({
        ...mockOffer,
        title: 'Updated Offer',
      } as any);

      const { result } = renderHook(() => useUpdateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { title: 'Updated Offer' } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.update).toHaveBeenCalledWith('offer-123', { title: 'Updated Offer' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offersApi.update).mockRejectedValue({
        response: { data: { message: 'Update failed' } },
      });

      const { result } = renderHook(() => useUpdateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { title: 'Updated' } as any,
        });
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

  describe('useDeleteOffer', () => {
    it('should delete offer and show success toast', async () => {
      vi.mocked(offersApi.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('offer-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.delete).toHaveBeenCalledWith('offer-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offersApi.delete).mockRejectedValue({
        response: { data: { message: 'Cannot delete' } },
      });

      const { result } = renderHook(() => useDeleteOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('offer-123');
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

  describe('useUpdateOfferStatus', () => {
    it('should update offer status and show success toast', async () => {
      vi.mocked(offersApi.updateStatus).mockResolvedValue({
        ...mockOffer,
        status: 'SENT',
      } as any);

      const { result } = renderHook(() => useUpdateOfferStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { status: 'SENT' } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.updateStatus).toHaveBeenCalledWith('offer-123', { status: 'SENT' });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast and rollback on failure', async () => {
      vi.mocked(offersApi.updateStatus).mockRejectedValue({
        response: { data: { message: 'Status change failed' } },
      });

      const { result } = renderHook(() => useUpdateOfferStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { status: 'ACCEPTED' } as any,
        });
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

  describe('useGenerateOfferDocument', () => {
    it('should generate document and show success toast', async () => {
      vi.mocked(offersApi.generateDocument).mockResolvedValue(mockOffer as any);

      const { result } = renderHook(() => useGenerateOfferDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('offer-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.generateDocument).toHaveBeenCalledWith('offer-123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offersApi.generateDocument).mockRejectedValue({
        response: { data: { message: 'Generation failed' } },
      });

      const { result } = renderHook(() => useGenerateOfferDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('offer-123');
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

  describe('useDownloadOfferDocument', () => {
    it('should download document', async () => {
      const mockBlob = new Blob(['doc data'], { type: 'application/octet-stream' });
      vi.mocked(offersApi.downloadDocument).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useDownloadOfferDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'offer-123', filename: 'oferta.docx' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.downloadDocument).toHaveBeenCalledWith('offer-123');
    });

    it('should show error toast on download failure', async () => {
      vi.mocked(offersApi.downloadDocument).mockRejectedValue({
        response: { data: { message: 'Download failed' } },
      });

      const { result } = renderHook(() => useDownloadOfferDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'offer-123', filename: 'oferta.docx' });
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

  describe('useSendOffer', () => {
    it('should send offer and show success toast', async () => {
      vi.mocked(offersApi.sendEmail).mockResolvedValue({
        ...mockOffer,
        status: 'SENT',
      } as any);

      const { result } = renderHook(() => useSendOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { recipientEmail: 'client@test.pl', subject: 'Oferta' } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.sendEmail).toHaveBeenCalledWith('offer-123', {
        recipientEmail: 'client@test.pl',
        subject: 'Oferta',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast and rollback on send failure', async () => {
      vi.mocked(offersApi.sendEmail).mockRejectedValue({
        response: { data: { message: 'Send failed' } },
      });

      const { result } = renderHook(() => useSendOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { recipientEmail: 'client@test.pl' } as any,
        });
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

  describe('useDuplicateOffer', () => {
    it('should duplicate offer and show success toast', async () => {
      vi.mocked(offersApi.duplicate).mockResolvedValue({
        ...mockOffer,
        id: 'offer-456',
      } as any);

      const { result } = renderHook(() => useDuplicateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'offer-123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.duplicate).toHaveBeenCalledWith('offer-123', undefined);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on failure', async () => {
      vi.mocked(offersApi.duplicate).mockRejectedValue({
        response: { data: { message: 'Duplicate failed' } },
      });

      const { result } = renderHook(() => useDuplicateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'offer-123' });
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

  // ========================================
  // Export Hooks
  // ========================================

  describe('useExportOffers', () => {
    it('should export CSV and show success toast', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      vi.mocked(offersApi.exportCsv).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useExportOffers(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ status: 'DRAFT' } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offersApi.exportCsv).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on export failure', async () => {
      vi.mocked(offersApi.exportCsv).mockRejectedValue({
        response: { data: { message: 'Export failed' } },
      });

      const { result } = renderHook(() => useExportOffers(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined);
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

  // ========================================
  // Error Handling
  // ========================================

  describe('error handling', () => {
    it('should handle network errors on queries', async () => {
      vi.mocked(offersApi.getAll).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useOffers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should show generic error message when API error has no message', async () => {
      vi.mocked(offersApi.update).mockRejectedValue({});

      const { result } = renderHook(() => useUpdateOffer(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'offer-123',
          data: { title: 'test' } as any,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nie udało się zaktualizować oferty',
        })
      );
    });
  });
});
