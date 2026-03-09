import { MemoryRouter } from 'react-router-dom';

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useEmailClientBasePath, useEmailClientNavigation } from './use-email-client-navigation';

const createWrapper = (initialEntry: string) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('use-email-client-navigation hooks', () => {
  describe('useEmailClientBasePath', () => {
    it('should return admin base path for admin routes', () => {
      const { result } = renderHook(() => useEmailClientBasePath(), {
        wrapper: createWrapper('/admin/modules/email-client/inbox'),
      });

      expect(result.current).toBe('/admin/modules/email-client');
    });

    it('should return company base path for company routes', () => {
      const { result } = renderHook(() => useEmailClientBasePath(), {
        wrapper: createWrapper('/company/modules/email-client/drafts'),
      });

      expect(result.current).toBe('/company/modules/email-client');
    });

    it('should return default base path for employee routes', () => {
      const { result } = renderHook(() => useEmailClientBasePath(), {
        wrapper: createWrapper('/modules/email-client/sent'),
      });

      expect(result.current).toBe('/modules/email-client');
    });

    it('should return fallback path when no match', () => {
      const { result } = renderHook(() => useEmailClientBasePath(), {
        wrapper: createWrapper('/other/path'),
      });

      expect(result.current).toBe('/modules/email-client');
    });
  });

  describe('useEmailClientNavigation', () => {
    it('should provide path getters with correct base path', () => {
      const { result } = renderHook(() => useEmailClientNavigation(), {
        wrapper: createWrapper('/admin/modules/email-client/inbox'),
      });

      expect(result.current.basePath).toBe('/admin/modules/email-client');
      expect(result.current.getInboxPath()).toBe('/admin/modules/email-client/inbox');
      expect(result.current.getDraftsPath()).toBe('/admin/modules/email-client/drafts');
      expect(result.current.getSentPath()).toBe('/admin/modules/email-client/sent');
      expect(result.current.getTrashPath()).toBe('/admin/modules/email-client/trash');
      expect(result.current.getMessagePath(42)).toBe('/admin/modules/email-client/message/42');
      expect(result.current.getComposePath()).toBe('/admin/modules/email-client/compose');
      expect(result.current.getComposePath('to=test@example.com')).toBe(
        '/admin/modules/email-client/compose?to=test@example.com'
      );
      expect(result.current.getFolderPath('Archive')).toBe(
        '/admin/modules/email-client/folder/Archive'
      );
    });

    it('should encode folder names in path', () => {
      const { result } = renderHook(() => useEmailClientNavigation(), {
        wrapper: createWrapper('/modules/email-client/inbox'),
      });

      expect(result.current.getFolderPath('My Folder')).toBe(
        '/modules/email-client/folder/My%20Folder'
      );
    });
  });
});
