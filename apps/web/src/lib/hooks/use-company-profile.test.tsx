import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCompanyProfile, useUpdateCompanyProfile } from './use-company-profile';
import { companyApi } from '../api/endpoints/company';

vi.mock('../api/endpoints/company');

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

const mockProfile = {
  id: 'company-1',
  name: 'Biuro Rachunkowe',
  nip: '1234567890',
  city: 'Warszawa',
  postalCode: '00-001',
};

describe('use-company-profile hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCompanyProfile', () => {
    it('should fetch company profile', async () => {
      vi.mocked(companyApi.getProfile).mockResolvedValue(mockProfile as any);

      const { result } = renderHook(() => useCompanyProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfile);
      expect(companyApi.getProfile).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      vi.mocked(companyApi.getProfile).mockRejectedValue(new Error('Forbidden'));

      const { result } = renderHook(() => useCompanyProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateCompanyProfile', () => {
    it('should update company profile', async () => {
      vi.mocked(companyApi.updateProfile).mockResolvedValue({
        ...mockProfile,
        city: 'Krakow',
      } as any);

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ city: 'Krakow' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(companyApi.updateProfile).toHaveBeenCalledWith({ city: 'Krakow' });
    });

    it('should handle update error', async () => {
      vi.mocked(companyApi.updateProfile).mockRejectedValue(new Error('Validation failed'));

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ nip: 'invalid' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
