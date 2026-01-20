import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTablePreferences, ColumnConfig, ViewMode } from './use-table-preferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const defaultColumns: ColumnConfig[] = [
  { id: 'name', label: 'Nazwa', alwaysVisible: true },
  { id: 'email', label: 'Email', defaultVisible: true },
  { id: 'phone', label: 'Telefon', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: false },
  { id: 'createdAt', label: 'Data utworzenia' },
];

describe('useTablePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('initialization', () => {
    it('should return default preferences when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      expect(result.current.viewMode).toBe('table');
      expect(result.current.visibleColumns).toContain('name');
      expect(result.current.visibleColumns).toContain('email');
      expect(result.current.visibleColumns).toContain('phone');
      expect(result.current.visibleColumns).toContain('createdAt');
      // status has defaultVisible: false, so it should not be included
      expect(result.current.visibleColumns).not.toContain('status');
    });

    it('should load preferences from localStorage', () => {
      const storedPrefs = {
        viewMode: 'grid' as ViewMode,
        visibleColumns: ['name', 'email', 'status'],
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs));

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      expect(result.current.viewMode).toBe('grid');
      expect(result.current.visibleColumns).toContain('email');
      expect(result.current.visibleColumns).toContain('status');
    });

    it('should handle malformed localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json {{{');

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // Should fall back to defaults
      expect(result.current.viewMode).toBe('table');
      expect(result.current.visibleColumns).toContain('name');
    });

    it('should handle localStorage with missing properties', () => {
      // Missing visibleColumns array
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ viewMode: 'grid' }));

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // Should fall back to defaults
      expect(result.current.viewMode).toBe('table');
    });

    it('should always include always-visible columns even from stored preferences', () => {
      const storedPrefs = {
        viewMode: 'table' as ViewMode,
        visibleColumns: ['email', 'status'], // Missing 'name' which is alwaysVisible
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs));

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // 'name' should be included even though it wasn't in stored preferences
      expect(result.current.visibleColumns).toContain('name');
      expect(result.current.visibleColumns).toContain('email');
      expect(result.current.visibleColumns).toContain('status');
    });
  });

  describe('toggleColumn', () => {
    it('should toggle a column visibility', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // Initially email is visible
      expect(result.current.visibleColumns).toContain('email');

      // Toggle off
      act(() => {
        result.current.toggleColumn('email');
      });

      expect(result.current.visibleColumns).not.toContain('email');

      // Toggle back on
      act(() => {
        result.current.toggleColumn('email');
      });

      expect(result.current.visibleColumns).toContain('email');
    });

    it('should not toggle alwaysVisible columns', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // 'name' is alwaysVisible
      expect(result.current.visibleColumns).toContain('name');

      // Try to toggle it off
      act(() => {
        result.current.toggleColumn('name');
      });

      // Should still be visible
      expect(result.current.visibleColumns).toContain('name');
    });

    it('should add column that was not visible', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // status has defaultVisible: false
      expect(result.current.visibleColumns).not.toContain('status');

      act(() => {
        result.current.toggleColumn('status');
      });

      expect(result.current.visibleColumns).toContain('status');
    });
  });

  describe('setViewMode', () => {
    it('should update view mode', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      expect(result.current.viewMode).toBe('table');

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });

    it('should persist view mode to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const lastCall = localStorageMock.setItem.mock.calls.at(-1);
      const savedPrefs = JSON.parse(lastCall?.[1] || '{}');
      expect(savedPrefs.viewMode).toBe('grid');
    });
  });

  describe('isColumnVisible', () => {
    it('should return true for visible columns', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      expect(result.current.isColumnVisible('name')).toBe(true);
      expect(result.current.isColumnVisible('email')).toBe(true);
    });

    it('should return false for hidden columns', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // status has defaultVisible: false
      expect(result.current.isColumnVisible('status')).toBe(false);
    });

    it('should return false for non-existent columns', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      expect(result.current.isColumnVisible('nonexistent')).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset preferences to defaults', () => {
      const storedPrefs = {
        viewMode: 'grid' as ViewMode,
        visibleColumns: ['name', 'status'],
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs));

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // Verify we loaded stored prefs
      expect(result.current.viewMode).toBe('grid');
      expect(result.current.visibleColumns).toContain('status');

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.viewMode).toBe('table');
      expect(result.current.visibleColumns).toContain('name');
      expect(result.current.visibleColumns).toContain('email');
      expect(result.current.visibleColumns).toContain('phone');
      expect(result.current.visibleColumns).not.toContain('status');
    });
  });

  describe('persistence', () => {
    it('should use correct storage key based on tableId', () => {
      localStorageMock.getItem.mockReturnValue(null);

      renderHook(() => useTablePreferences('my-custom-table', defaultColumns));

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'table_preferences_my-custom-table'
      );
    });

    it('should persist changes to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      act(() => {
        result.current.toggleColumn('email');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'table_preferences_test-table',
        expect.any(String)
      );
    });

    it('should handle localStorage quota exceeded error gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() =>
        useTablePreferences('test-table', defaultColumns)
      );

      // Should not throw even if localStorage fails
      expect(() => {
        act(() => {
          result.current.setViewMode('grid');
        });
      }).not.toThrow();

      // State should still update even if persistence fails
      expect(result.current.viewMode).toBe('grid');
    });
  });

  describe('multiple tables', () => {
    it('should maintain separate preferences for different tables', () => {
      const prefs1 = { viewMode: 'grid', visibleColumns: ['name', 'email'] };
      const prefs2 = { viewMode: 'table', visibleColumns: ['name', 'status'] };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'table_preferences_table1') return JSON.stringify(prefs1);
        if (key === 'table_preferences_table2') return JSON.stringify(prefs2);
        return null;
      });

      const { result: result1 } = renderHook(() =>
        useTablePreferences('table1', defaultColumns)
      );
      const { result: result2 } = renderHook(() =>
        useTablePreferences('table2', defaultColumns)
      );

      expect(result1.current.viewMode).toBe('grid');
      expect(result2.current.viewMode).toBe('table');
      expect(result1.current.visibleColumns).toContain('email');
      expect(result2.current.visibleColumns).toContain('status');
    });
  });
});
