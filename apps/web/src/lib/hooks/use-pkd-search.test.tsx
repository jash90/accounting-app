import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePkdCode, usePkdSearch } from './use-pkd-search';
import { clientsApi } from '../api/endpoints/clients';

vi.mock('../api/endpoints/clients');

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

const mockPkdCodes = [
  { code: '62.01.Z', label: 'Computer programming activities', section: 'J' },
  { code: '62.02.Z', label: 'Computer consultancy activities', section: 'J' },
];

const mockSections = { J: 'Information and communication', C: 'Manufacturing' };

describe('use-pkd-search hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('usePkdSearch', () => {
    it('should initialize with default empty search and fetch results', async () => {
      vi.mocked(clientsApi.searchPkdCodes).mockResolvedValue(mockPkdCodes as any);
      vi.mocked(clientsApi.getPkdSections).mockResolvedValue(mockSections as any);

      vi.useRealTimers();
      const { result } = renderHook(() => usePkdSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.search).toBe('');

      await waitFor(() => {
        expect(result.current.options).toHaveLength(2);
      });

      expect(result.current.options[0]).toEqual({
        value: '62.01.Z',
        label: 'Computer programming activities',
        group: 'J',
      });
    });

    it('should debounce search input', async () => {
      vi.mocked(clientsApi.searchPkdCodes).mockResolvedValue(mockPkdCodes as any);
      vi.mocked(clientsApi.getPkdSections).mockResolvedValue(mockSections as any);

      const { result } = renderHook(() => usePkdSearch(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearch('computer');
      });

      // Search should not have been updated to 'computer' immediately in debounced value
      expect(result.current.search).toBe('computer');
      expect(result.current.debouncedSearch).toBe('');

      // Advance timers past debounce delay
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.debouncedSearch).toBe('computer');
    });

    it('should transform sections into groups format', async () => {
      vi.mocked(clientsApi.searchPkdCodes).mockResolvedValue([]);
      vi.mocked(clientsApi.getPkdSections).mockResolvedValue(mockSections as any);

      vi.useRealTimers();
      const { result } = renderHook(() => usePkdSearch(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(2);
      });

      expect(result.current.groups).toEqual([
        { key: 'J', label: 'Information and communication' },
        { key: 'C', label: 'Manufacturing' },
      ]);
    });

    it('should allow setting a section filter', async () => {
      vi.mocked(clientsApi.searchPkdCodes).mockResolvedValue(mockPkdCodes as any);
      vi.mocked(clientsApi.getPkdSections).mockResolvedValue(mockSections as any);

      vi.useRealTimers();
      const { result } = renderHook(() => usePkdSearch('', 'J'), {
        wrapper: createWrapper(),
      });

      expect(result.current.section).toBe('J');

      await waitFor(() => {
        expect(clientsApi.searchPkdCodes).toHaveBeenCalledWith(
          expect.objectContaining({ section: 'J' })
        );
      });
    });
  });

  describe('usePkdCode', () => {
    it('should fetch a single PKD code', async () => {
      vi.mocked(clientsApi.searchPkdCodes).mockResolvedValue([mockPkdCodes[0]] as any);

      vi.useRealTimers();
      const { result } = renderHook(() => usePkdCode('62.01.Z'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(result.current).toEqual(mockPkdCodes[0]);
      expect(clientsApi.searchPkdCodes).toHaveBeenCalledWith({
        search: '62.01.Z',
        limit: 1,
      });
    });

    it('should not fetch when code is null', () => {
      vi.useRealTimers();
      renderHook(() => usePkdCode(null), {
        wrapper: createWrapper(),
      });

      expect(clientsApi.searchPkdCodes).not.toHaveBeenCalled();
    });
  });
});
