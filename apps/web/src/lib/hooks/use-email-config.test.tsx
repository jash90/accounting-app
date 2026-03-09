import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/ui/use-toast';

import {
  useCompanyEmailConfig,
  useCreateCompanyEmailConfig,
  useCreateSystemAdminEmailConfig,
  useCreateUserEmailConfig,
  useDeleteCompanyEmailConfig,
  useDeleteUserEmailConfig,
  useSystemAdminEmailConfig,
  useTestImap,
  useTestSmtp,
  useUpdateCompanyEmailConfig,
  useUpdateUserEmailConfig,
  useUserEmailConfig,
} from './use-email-config';
import { emailConfigApi } from '../api/endpoints/email-config';

// Mock the API modules
vi.mock('../api/endpoints/email-config');
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

const mockEmailConfig = {
  id: 'config-123',
  smtpHost: 'smtp.test.com',
  smtpPort: 587,
  imapHost: 'imap.test.com',
  imapPort: 993,
  email: 'test@test.com',
};

describe('use-email-config hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast } as any);
  });

  // ========================================
  // User Email Config Query Hooks
  // ========================================

  describe('useUserEmailConfig', () => {
    it('should fetch user email configuration', async () => {
      vi.mocked(emailConfigApi.getUserConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmailConfig);
      expect(emailConfigApi.getUserConfig).toHaveBeenCalled();
    });

    it('should handle 404 when no config exists', async () => {
      vi.mocked(emailConfigApi.getUserConfig).mockRejectedValue({
        response: { status: 404 },
      });

      const { result } = renderHook(() => useUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ========================================
  // User Email Config Mutation Hooks
  // ========================================

  describe('useCreateUserEmailConfig', () => {
    it('should create user email config and show success toast', async () => {
      vi.mocked(emailConfigApi.createUserConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useCreateUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          smtpHost: 'smtp.test.com',
          smtpPort: 587,
          email: 'test@test.com',
          password: 'secret',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });

    it('should show error toast on creation failure', async () => {
      vi.mocked(emailConfigApi.createUserConfig).mockRejectedValue({
        response: { data: { message: 'Creation failed' } },
      });

      const { result } = renderHook(() => useCreateUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({} as any);
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

  describe('useUpdateUserEmailConfig', () => {
    it('should update user email config and show success toast', async () => {
      vi.mocked(emailConfigApi.updateUserConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useUpdateUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ smtpPort: 465 } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useDeleteUserEmailConfig', () => {
    it('should delete user email config and show success toast', async () => {
      vi.mocked(emailConfigApi.deleteUserConfig).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteUserEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  // ========================================
  // Company Email Config Hooks
  // ========================================

  describe('useCompanyEmailConfig', () => {
    it('should fetch company email configuration', async () => {
      vi.mocked(emailConfigApi.getCompanyConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useCompanyEmailConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmailConfig);
    });
  });

  describe('useCreateCompanyEmailConfig', () => {
    it('should create company email config and show success toast', async () => {
      vi.mocked(emailConfigApi.createCompanyConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useCreateCompanyEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          smtpHost: 'smtp.company.com',
          smtpPort: 587,
          email: 'company@test.com',
          password: 'secret',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });

  describe('useUpdateCompanyEmailConfig', () => {
    it('should update company email config', async () => {
      vi.mocked(emailConfigApi.updateCompanyConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useUpdateCompanyEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ smtpPort: 465 } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useDeleteCompanyEmailConfig', () => {
    it('should delete company email config', async () => {
      vi.mocked(emailConfigApi.deleteCompanyConfig).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteCompanyEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(undefined as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  // ========================================
  // Connection Test Hooks
  // ========================================

  describe('useTestSmtp', () => {
    it('should test SMTP connection and show success message', async () => {
      vi.mocked(emailConfigApi.testSmtp).mockResolvedValue({
        message: 'SMTP connection successful',
      });

      const { result } = renderHook(() => useTestSmtp(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          host: 'smtp.test.com',
          port: 587,
          username: 'user',
          password: 'pass',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sukces',
          description: 'SMTP connection successful',
        })
      );
    });
  });

  describe('useTestImap', () => {
    it('should test IMAP connection and show success message', async () => {
      vi.mocked(emailConfigApi.testImap).mockResolvedValue({
        message: 'IMAP connection successful',
      });

      const { result } = renderHook(() => useTestImap(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          host: 'imap.test.com',
          port: 993,
          username: 'user',
          password: 'pass',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sukces',
          description: 'IMAP connection successful',
        })
      );
    });
  });

  // ========================================
  // System Admin Hooks
  // ========================================

  describe('useSystemAdminEmailConfig', () => {
    it('should fetch system admin email configuration', async () => {
      vi.mocked(emailConfigApi.getSystemAdminConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useSystemAdminEmailConfig(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmailConfig);
    });
  });

  describe('useCreateSystemAdminEmailConfig', () => {
    it('should create system admin email config', async () => {
      vi.mocked(emailConfigApi.createSystemAdminConfig).mockResolvedValue(mockEmailConfig as any);

      const { result } = renderHook(() => useCreateSystemAdminEmailConfig(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          smtpHost: 'smtp.admin.com',
          smtpPort: 587,
          email: 'admin@test.com',
          password: 'secret',
        } as any);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sukces' }));
    });
  });
});
