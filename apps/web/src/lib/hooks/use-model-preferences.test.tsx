import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModelPreferences } from './use-model-preferences';

describe('useModelPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with empty favorites and recents', () => {
    const { result } = renderHook(() => useModelPreferences());

    expect(result.current.favorites).toEqual([]);
    expect(result.current.recents).toEqual([]);
  });

  it('should toggle favorites', () => {
    const { result } = renderHook(() => useModelPreferences());

    act(() => {
      result.current.toggleFavorite('gpt-4');
    });

    expect(result.current.favorites).toEqual(['gpt-4']);
    expect(result.current.isFavorite('gpt-4')).toBe(true);
    expect(result.current.isFavorite('claude-3')).toBe(false);

    // Toggle off
    act(() => {
      result.current.toggleFavorite('gpt-4');
    });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('gpt-4')).toBe(false);
  });

  it('should add recents and limit to MAX_RECENTS', () => {
    const { result } = renderHook(() => useModelPreferences());

    act(() => {
      result.current.addRecent('model-1');
      result.current.addRecent('model-2');
      result.current.addRecent('model-3');
      result.current.addRecent('model-4');
      result.current.addRecent('model-5');
      result.current.addRecent('model-6');
    });

    // Should only keep last 5 (MAX_RECENTS)
    expect(result.current.recents).toHaveLength(5);
    expect(result.current.recents[0]).toBe('model-6');
    // model-1 should have been evicted
    expect(result.current.recents).not.toContain('model-1');
  });

  it('should move duplicate recent to front', () => {
    const { result } = renderHook(() => useModelPreferences());

    act(() => {
      result.current.addRecent('model-1');
      result.current.addRecent('model-2');
      result.current.addRecent('model-3');
    });

    act(() => {
      result.current.addRecent('model-1');
    });

    expect(result.current.recents[0]).toBe('model-1');
    expect(result.current.recents).toHaveLength(3);
  });

  it('should clear recents', () => {
    const { result } = renderHook(() => useModelPreferences());

    act(() => {
      result.current.addRecent('model-1');
      result.current.addRecent('model-2');
    });

    expect(result.current.recents).toHaveLength(2);

    act(() => {
      result.current.clearRecents();
    });

    expect(result.current.recents).toEqual([]);
  });

  it('should persist to localStorage', () => {
    const { result } = renderHook(() => useModelPreferences());

    act(() => {
      result.current.toggleFavorite('gpt-4');
      result.current.addRecent('claude-3');
    });

    // After effect runs, check localStorage
    const storedFavorites = JSON.parse(localStorage.getItem('openrouter_favorite_models') || '[]');
    const storedRecents = JSON.parse(localStorage.getItem('openrouter_recent_models') || '[]');

    expect(storedFavorites).toEqual(['gpt-4']);
    expect(storedRecents).toEqual(['claude-3']);
  });

  it('should load from localStorage on init', () => {
    localStorage.setItem('openrouter_favorite_models', JSON.stringify(['gpt-4', 'claude-3']));
    localStorage.setItem('openrouter_recent_models', JSON.stringify(['model-1']));

    const { result } = renderHook(() => useModelPreferences());

    expect(result.current.favorites).toEqual(['gpt-4', 'claude-3']);
    expect(result.current.recents).toEqual(['model-1']);
  });
});
