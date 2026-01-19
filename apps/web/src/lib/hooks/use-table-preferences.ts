import { useState, useCallback, useEffect } from 'react';

export type ViewMode = 'table' | 'grid';

export interface TablePreferences {
  viewMode: ViewMode;
  visibleColumns: string[];
}

export interface ColumnConfig {
  id: string;
  label: string;
  alwaysVisible?: boolean;
  defaultVisible?: boolean;
}

interface UseTablePreferencesReturn {
  viewMode: ViewMode;
  visibleColumns: string[];
  setViewMode: (mode: ViewMode) => void;
  toggleColumn: (columnId: string) => void;
  isColumnVisible: (columnId: string) => boolean;
  resetToDefaults: () => void;
}

function getStorageKey(tableId: string): string {
  return `table_preferences_${tableId}`;
}

function loadFromStorage(tableId: string): TablePreferences | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.viewMode === 'string' && Array.isArray(parsed.visibleColumns)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

function saveToStorage(tableId: string, preferences: TablePreferences): void {
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(preferences));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

function getDefaultPreferences(columns: ColumnConfig[]): TablePreferences {
  return {
    viewMode: 'table',
    visibleColumns: columns
      .filter((col) => col.alwaysVisible || col.defaultVisible !== false)
      .map((col) => col.id),
  };
}

export function useTablePreferences(
  tableId: string,
  columns: ColumnConfig[]
): UseTablePreferencesReturn {
  const defaultPrefs = getDefaultPreferences(columns);

  const [preferences, setPreferences] = useState<TablePreferences>(() => {
    const stored = loadFromStorage(tableId);
    if (stored) {
      // Ensure always-visible columns are included
      const alwaysVisibleColumns = columns
        .filter((col) => col.alwaysVisible)
        .map((col) => col.id);

      const mergedVisibleColumns = [
        ...new Set([...alwaysVisibleColumns, ...stored.visibleColumns]),
      ];

      return {
        viewMode: stored.viewMode,
        visibleColumns: mergedVisibleColumns,
      };
    }
    return defaultPrefs;
  });

  // Sync preferences to localStorage
  useEffect(() => {
    saveToStorage(tableId, preferences);
  }, [tableId, preferences]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setPreferences((prev) => ({
      ...prev,
      viewMode: mode,
    }));
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    // Check if column is always visible
    const column = columns.find((col) => col.id === columnId);
    if (column?.alwaysVisible) {
      return; // Cannot toggle always-visible columns
    }

    setPreferences((prev) => {
      const isCurrentlyVisible = prev.visibleColumns.includes(columnId);

      if (isCurrentlyVisible) {
        return {
          ...prev,
          visibleColumns: prev.visibleColumns.filter((id) => id !== columnId),
        };
      }

      return {
        ...prev,
        visibleColumns: [...prev.visibleColumns, columnId],
      };
    });
  }, [columns]);

  const isColumnVisible = useCallback(
    (columnId: string) => preferences.visibleColumns.includes(columnId),
    [preferences.visibleColumns]
  );

  const resetToDefaults = useCallback(() => {
    setPreferences(defaultPrefs);
  }, [defaultPrefs]);

  return {
    viewMode: preferences.viewMode,
    visibleColumns: preferences.visibleColumns,
    setViewMode,
    toggleColumn,
    isColumnVisible,
    resetToDefaults,
  };
}
