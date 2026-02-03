import { useCallback } from 'react';

import { useThemeContext } from '@/contexts/theme-context';

/**
 * Hook for accessing and controlling the application theme.
 * Provides convenient accessors and actions for theme management.
 */
export function useTheme() {
  const { theme, themeId, colorMode, resolvedColorMode, setTheme, setColorMode, availableThemes } =
    useThemeContext();

  // Derived boolean states for convenience
  const isDark = resolvedColorMode === 'dark';
  const isLight = resolvedColorMode === 'light';
  const isSystemMode = colorMode === 'system';

  // Convenience actions
  const toggleColorMode = useCallback(() => {
    if (colorMode === 'system') {
      // If system mode, switch to the opposite of current resolved mode
      setColorMode(resolvedColorMode === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setColorMode(colorMode === 'dark' ? 'light' : 'dark');
    }
  }, [colorMode, resolvedColorMode, setColorMode]);

  const setSystemMode = useCallback(() => {
    setColorMode('system');
  }, [setColorMode]);

  const setLightMode = useCallback(() => {
    setColorMode('light');
  }, [setColorMode]);

  const setDarkMode = useCallback(() => {
    setColorMode('dark');
  }, [setColorMode]);

  // Get theme name for display
  const themeName = theme.name;

  return {
    // Current theme state
    theme,
    themeId,
    themeName,
    colorMode,
    resolvedColorMode,

    // Boolean states
    isDark,
    isLight,
    isSystemMode,

    // Actions
    setTheme,
    setColorMode,
    toggleColorMode,
    setSystemMode,
    setLightMode,
    setDarkMode,

    // Available options
    availableThemes,
  };
}
