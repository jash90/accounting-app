/**
 * Theme configuration types for the application theming system.
 * Supports light/dark modes with customizable color schemes.
 */

export type ColorMode = 'light' | 'dark' | 'system';

/**
 * HSL color values without the hsl() wrapper.
 * Format: "H S% L%" e.g., "209 90% 40%"
 */
export interface ThemeColors {
  // Core backgrounds
  background: string;
  foreground: string;

  // Card surfaces
  card: string;
  cardForeground: string;

  // Popover surfaces
  popover: string;
  popoverForeground: string;

  // Primary brand color
  primary: string;
  primaryForeground: string;

  // Secondary color
  secondary: string;
  secondaryForeground: string;

  // Muted/subtle elements
  muted: string;
  mutedForeground: string;

  // Accent highlights
  accent: string;
  accentForeground: string;

  // Destructive actions
  destructive: string;
  destructiveForeground: string;

  // Success states
  success: string;
  successForeground: string;

  // Borders and inputs
  border: string;
  input: string;
  ring: string;

  // Sidebar colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

/**
 * Simplified colors for theme preview cards.
 */
export interface ThemePreviewColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

/**
 * Complete theme definition with light and dark variants.
 */
export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  preview: {
    light: ThemePreviewColors;
    dark: ThemePreviewColors;
  };
}

/**
 * Theme context value exposed to consumers.
 */
export interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  colorMode: ColorMode;
  resolvedColorMode: 'light' | 'dark';
  setTheme: (themeId: string) => void;
  setColorMode: (mode: ColorMode) => void;
  availableThemes: Theme[];
}

/**
 * Stored preferences format with versioning for migrations.
 */
export interface StoredThemePreferences {
  version: number;
  themeId: string;
  colorMode: ColorMode;
}

/**
 * Current version of the theme preferences schema.
 * Increment when making breaking changes to the stored format.
 */
export const THEME_PREFERENCES_VERSION = 1;

/**
 * LocalStorage key for theme preferences.
 */
export const THEME_STORAGE_KEY = 'app_theme_preferences';

/**
 * Default theme ID when no preference is set.
 */
export const DEFAULT_THEME_ID = 'apptax';

/**
 * Default color mode when no preference is set.
 */
export const DEFAULT_COLOR_MODE: ColorMode = 'system';
