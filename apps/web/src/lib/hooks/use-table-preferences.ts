import { useState, useCallback, useEffect } from 'react';

/**
 * Current version of the preferences schema.
 * Increment this when making breaking changes to the stored format.
 */
const PREFERENCES_VERSION = 1;

export type ViewMode = 'table' | 'grid';

export interface TablePreferences {
  viewMode: ViewMode;
  visibleColumns: string[];
}

/**
 * Internal storage format with versioning support.
 */
interface StoredPreferences {
  version: number;
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

/**
 * Migrates preferences from older versions to the current version.
 * Add migration logic here when PREFERENCES_VERSION is incremented.
 *
 * @param stored - The stored preferences object
 * @returns Migrated preferences or null if migration fails
 */
function migratePreferences(stored: StoredPreferences): StoredPreferences | null {
  const version = stored.version ?? 0;

  // Already at current version
  if (version === PREFERENCES_VERSION) {
    return stored;
  }

  // Migration from version 0 (unversioned) to version 1
  if (version === 0) {
    // Version 1 just adds the version field, no data changes needed
    return {
      ...stored,
      version: PREFERENCES_VERSION,
    };
  }

  // Future migrations would go here:
  // if (version === 1) {
  //   // Migrate from v1 to v2
  //   stored = { ...stored, newField: defaultValue, version: 2 };
  // }

  // Unknown version - return null to trigger reset to defaults
  if (import.meta.env.DEV) {
    console.warn(
      `Unknown preferences version ${version}, resetting to defaults. ` +
      `Current version: ${PREFERENCES_VERSION}`
    );
  }
  return null;
}

function loadFromStorage(tableId: string): TablePreferences | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      const parsed = JSON.parse(stored) as StoredPreferences;
      if (parsed && typeof parsed.viewMode === 'string' && Array.isArray(parsed.visibleColumns)) {
        // Migrate if needed
        const migrated = migratePreferences(parsed);
        if (migrated) {
          return {
            viewMode: migrated.viewMode,
            visibleColumns: migrated.visibleColumns,
          };
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

function saveToStorage(tableId: string, preferences: TablePreferences): void {
  try {
    const storedPreferences: StoredPreferences = {
      version: PREFERENCES_VERSION,
      viewMode: preferences.viewMode,
      visibleColumns: preferences.visibleColumns,
    };
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(storedPreferences));
  } catch (error) {
    // Storage quota may be exceeded - warn user in development
    if (import.meta.env.DEV) {
      console.warn(
        'Failed to save table preferences - storage quota may be exceeded.',
        error
      );
    }
    // In production, silently fail but could optionally notify user
    // via toast or other mechanism if critical
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

      // Preserve user's column order by filtering stored columns first,
      // then prepending always-visible columns that may be missing
      const mergedVisibleColumns = [
        ...alwaysVisibleColumns,
        ...stored.visibleColumns.filter((id) => !alwaysVisibleColumns.includes(id)),
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

  // Reload preferences when tableId changes
  useEffect(() => {
    const stored = loadFromStorage(tableId);
    if (stored) {
      // Ensure always-visible columns are included
      const alwaysVisibleColumns = columns
        .filter((col) => col.alwaysVisible)
        .map((col) => col.id);

      const mergedVisibleColumns = [
        ...alwaysVisibleColumns,
        ...stored.visibleColumns.filter((id) => !alwaysVisibleColumns.includes(id)),
      ];

      setPreferences({
        viewMode: stored.viewMode,
        visibleColumns: mergedVisibleColumns,
      });
    } else {
      setPreferences(defaultPrefs);
    }
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only re-run when tableId changes

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
    // Recalculate defaults from current columns to avoid stale closure
    setPreferences(getDefaultPreferences(columns));
  }, [columns]);

  return {
    viewMode: preferences.viewMode,
    visibleColumns: preferences.visibleColumns,
    setViewMode,
    toggleColumn,
    isColumnVisible,
    resetToDefaults,
  };
}
