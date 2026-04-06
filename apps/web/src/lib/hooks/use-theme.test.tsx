import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeContext } from '@/contexts/theme-context';

import { useTheme } from './use-theme';

const mockSetTheme = vi.fn();
const mockSetColorMode = vi.fn();

vi.mock('@/contexts/theme-context', () => ({
  useThemeContext: vi.fn(() => ({
    theme: { name: 'Default', id: 'default' },
    themeId: 'default',
    colorMode: 'light' as const,
    resolvedColorMode: 'light' as const,
    setTheme: mockSetTheme,
    setColorMode: mockSetColorMode,
    availableThemes: [
      { id: 'default', name: 'Default' },
      { id: 'ocean', name: 'Ocean' },
    ],
  })),
}));

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current theme state', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.themeId).toBe('default');
    expect(result.current.themeName).toBe('Default');
    expect(result.current.colorMode).toBe('light');
    expect(result.current.resolvedColorMode).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(result.current.isLight).toBe(true);
    expect(result.current.isSystemMode).toBe(false);
    expect(result.current.availableThemes).toHaveLength(2);
  });

  it('should provide dark mode detection', () => {
    vi.mocked(useThemeContext).mockReturnValue({
      theme: { name: 'Default', id: 'default' } as any,
      themeId: 'default',
      colorMode: 'dark',
      resolvedColorMode: 'dark',
      setTheme: mockSetTheme,
      setColorMode: mockSetColorMode,
      availableThemes: [],
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(true);
    expect(result.current.isLight).toBe(false);
  });

  it('should toggle color mode from light to dark', () => {
    vi.mocked(useThemeContext).mockReturnValue({
      theme: { name: 'Default', id: 'default' } as any,
      themeId: 'default',
      colorMode: 'light',
      resolvedColorMode: 'light',
      setTheme: mockSetTheme,
      setColorMode: mockSetColorMode,
      availableThemes: [],
    });

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleColorMode();
    });

    expect(mockSetColorMode).toHaveBeenCalledWith('dark');
  });

  it('should toggle color mode from system to opposite of resolved', () => {
    vi.mocked(useThemeContext).mockReturnValue({
      theme: { name: 'Default', id: 'default' } as any,
      themeId: 'default',
      colorMode: 'system',
      resolvedColorMode: 'dark',
      setTheme: mockSetTheme,
      setColorMode: mockSetColorMode,
      availableThemes: [],
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.isSystemMode).toBe(true);

    act(() => {
      result.current.toggleColorMode();
    });

    expect(mockSetColorMode).toHaveBeenCalledWith('light');
  });

  it('should provide convenience mode setters', () => {
    vi.mocked(useThemeContext).mockReturnValue({
      theme: { name: 'Default', id: 'default' } as any,
      themeId: 'default',
      colorMode: 'light',
      resolvedColorMode: 'light',
      setTheme: mockSetTheme,
      setColorMode: mockSetColorMode,
      availableThemes: [],
    });

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setDarkMode();
    });
    expect(mockSetColorMode).toHaveBeenCalledWith('dark');

    act(() => {
      result.current.setLightMode();
    });
    expect(mockSetColorMode).toHaveBeenCalledWith('light');

    act(() => {
      result.current.setSystemMode();
    });
    expect(mockSetColorMode).toHaveBeenCalledWith('system');
  });
});
