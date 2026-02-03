import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import {
  applyThemeToDOM,
  createStorageListener,
  createSystemColorSchemeListener,
  getDefaultPreferences,
  getThemeById,
  loadThemePreferences,
  prebuiltThemes,
  saveThemePreferences,
  type ColorMode,
  type ThemeContextValue,
} from '@/lib/themes';

interface ThemeState {
  themeId: string;
  colorMode: ColorMode;
  systemColorMode: 'light' | 'dark';
}

type ThemeAction =
  | { type: 'SET_THEME'; payload: string }
  | { type: 'SET_COLOR_MODE'; payload: ColorMode }
  | { type: 'SET_SYSTEM_COLOR_MODE'; payload: 'light' | 'dark' }
  | { type: 'SYNC_FROM_STORAGE'; payload: { themeId: string; colorMode: ColorMode } };

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, themeId: action.payload };
    case 'SET_COLOR_MODE':
      return { ...state, colorMode: action.payload };
    case 'SET_SYSTEM_COLOR_MODE':
      return { ...state, systemColorMode: action.payload };
    case 'SYNC_FROM_STORAGE':
      return {
        ...state,
        themeId: action.payload.themeId,
        colorMode: action.payload.colorMode,
      };
    default:
      return state;
  }
}

function getInitialState(): ThemeState {
  const stored = loadThemePreferences();
  const defaults = getDefaultPreferences();

  // Determine initial system color mode
  const systemColorMode =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : 'light';

  return {
    themeId: stored?.themeId ?? defaults.themeId,
    colorMode: stored?.colorMode ?? defaults.colorMode,
    systemColorMode,
  };
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(themeReducer, undefined, getInitialState);

  const theme = useMemo(() => getThemeById(state.themeId), [state.themeId]);

  const resolvedColorMode = useMemo(() => {
    if (state.colorMode === 'system') {
      return state.systemColorMode;
    }
    return state.colorMode;
  }, [state.colorMode, state.systemColorMode]);

  // Apply theme to DOM whenever theme or resolved color mode changes
  useEffect(() => {
    applyThemeToDOM(theme, resolvedColorMode);
  }, [theme, resolvedColorMode]);

  // Listen for system color scheme changes
  useEffect(() => {
    const unsubscribe = createSystemColorSchemeListener((mode) => {
      dispatch({ type: 'SET_SYSTEM_COLOR_MODE', payload: mode });
    });
    return unsubscribe;
  }, []);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const unsubscribe = createStorageListener((preferences) => {
      if (preferences) {
        dispatch({ type: 'SYNC_FROM_STORAGE', payload: preferences });
      }
    });
    return unsubscribe;
  }, []);

  // Persist preferences to localStorage
  useEffect(() => {
    saveThemePreferences(state.themeId, state.colorMode);
  }, [state.themeId, state.colorMode]);

  const setTheme = useCallback((themeId: string) => {
    dispatch({ type: 'SET_THEME', payload: themeId });
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    dispatch({ type: 'SET_COLOR_MODE', payload: mode });
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeId: state.themeId,
      colorMode: state.colorMode,
      resolvedColorMode,
      setTheme,
      setColorMode,
      availableThemes: prebuiltThemes,
    }),
    [theme, state.themeId, state.colorMode, resolvedColorMode, setTheme, setColorMode]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
