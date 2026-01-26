import {
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  THEME_PREFERENCES_VERSION,
  THEME_STORAGE_KEY,
  type ColorMode,
  type StoredThemePreferences,
  type Theme,
  type ThemeColors,
} from './theme-config';

/**
 * CSS variable names mapped to ThemeColors property names.
 */
const CSS_VARIABLE_MAP: Record<keyof ThemeColors, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  chart1: '--chart-1',
  chart2: '--chart-2',
  chart3: '--chart-3',
  chart4: '--chart-4',
  chart5: '--chart-5',
};

/**
 * Applies theme colors to the document root as CSS variables.
 */
export function applyThemeToDOM(theme: Theme, mode: 'light' | 'dark'): void {
  const root = document.documentElement;
  const colors = theme.colors[mode];

  // Apply all color variables
  for (const [key, cssVar] of Object.entries(CSS_VARIABLE_MAP)) {
    const value = colors[key as keyof ThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Update dark mode class
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Detects the user's system color scheme preference.
 */
export function getSystemColorMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolves a color mode setting to the actual mode to use.
 */
export function resolveColorMode(colorMode: ColorMode): 'light' | 'dark' {
  if (colorMode === 'system') {
    return getSystemColorMode();
  }
  return colorMode;
}

/**
 * Migrates preferences from older versions to the current version.
 */
function migratePreferences(stored: StoredThemePreferences): StoredThemePreferences | null {
  const version = stored.version ?? 0;

  // Already at current version
  if (version === THEME_PREFERENCES_VERSION) {
    return stored;
  }

  // Migration from version 0 (unversioned) to version 1
  if (version === 0) {
    return {
      ...stored,
      version: THEME_PREFERENCES_VERSION,
    };
  }

  // Unknown version - return null to trigger reset to defaults
  if (import.meta.env.DEV) {
    console.warn(
      `Unknown theme preferences version ${version}, resetting to defaults. ` +
        `Current version: ${THEME_PREFERENCES_VERSION}`
    );
  }
  return null;
}

/**
 * Loads theme preferences from localStorage.
 */
export function loadThemePreferences(): { themeId: string; colorMode: ColorMode } | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredThemePreferences;
      if (
        parsed &&
        typeof parsed.themeId === 'string' &&
        typeof parsed.colorMode === 'string' &&
        ['light', 'dark', 'system'].includes(parsed.colorMode)
      ) {
        const migrated = migratePreferences(parsed);
        if (migrated) {
          return {
            themeId: migrated.themeId,
            colorMode: migrated.colorMode,
          };
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Saves theme preferences to localStorage.
 */
export function saveThemePreferences(themeId: string, colorMode: ColorMode): void {
  try {
    const stored: StoredThemePreferences = {
      version: THEME_PREFERENCES_VERSION,
      themeId,
      colorMode,
    };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to save theme preferences:', error);
    }
  }
}

/**
 * Gets default theme preferences.
 */
export function getDefaultPreferences(): { themeId: string; colorMode: ColorMode } {
  return {
    themeId: DEFAULT_THEME_ID,
    colorMode: DEFAULT_COLOR_MODE,
  };
}

/**
 * Creates a listener for system color scheme changes.
 */
export function createSystemColorSchemeListener(
  callback: (mode: 'light' | 'dark') => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Creates a listener for storage changes (cross-tab sync).
 */
export function createStorageListener(
  callback: (preferences: { themeId: string; colorMode: ColorMode } | null) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      callback(loadThemePreferences());
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}
