import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '@/contexts/auth-context';

import { useModuleBasePath, useModuleCreatePath } from './use-module-base-path';

vi.mock('@/contexts/auth-context', () => ({
  useAuthContext: vi.fn(),
}));

describe('use-module-base-path hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useModuleBasePath', () => {
    it('should return admin path for ADMIN role', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { role: 'ADMIN' } as any,
      } as any);

      const { result } = renderHook(() => useModuleBasePath('clients'));

      expect(result.current).toBe('/admin/modules/clients');
    });

    it('should return company path for COMPANY_OWNER role', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { role: 'COMPANY_OWNER' } as any,
      } as any);

      const { result } = renderHook(() => useModuleBasePath('tasks'));

      expect(result.current).toBe('/company/modules/tasks');
    });

    it('should return default path for EMPLOYEE role', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { role: 'EMPLOYEE' } as any,
      } as any);

      const { result } = renderHook(() => useModuleBasePath('time-tracking'));

      expect(result.current).toBe('/modules/time-tracking');
    });
  });

  describe('useModuleCreatePath', () => {
    it('should append /create to the base path', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        user: { role: 'ADMIN' } as any,
      } as any);

      const { result } = renderHook(() => useModuleCreatePath('clients'));

      expect(result.current).toBe('/admin/modules/clients/create');
    });
  });
});
