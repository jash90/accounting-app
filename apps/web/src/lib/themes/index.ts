// Type definitions
export {
  type ColorMode,
  type Theme,
  type ThemeColors,
  type ThemeContextValue,
  type ThemePreviewColors,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
} from './theme-config';

// Prebuilt themes
export {
  apptaxTheme,
  flowbooksTheme,
  forestTheme,
  getThemeById,
  midnightTheme,
  oceanTheme,
  prebuiltThemes,
  sunsetTheme,
} from './prebuilt-themes';

// Utilities
export {
  applyThemeToDOM,
  createStorageListener,
  createSystemColorSchemeListener,
  getDefaultPreferences,
  getSystemColorMode,
  loadThemePreferences,
  resolveColorMode,
  saveThemePreferences,
} from './theme-utils';
