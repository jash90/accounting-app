import { useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'openrouter_favorite_models';
const RECENTS_KEY = 'openrouter_recent_models';
const MAX_RECENTS = 5;

interface ModelPreferences {
  favorites: string[];
  recents: string[];
  toggleFavorite: (modelId: string) => void;
  isFavorite: (modelId: string) => boolean;
  addRecent: (modelId: string) => void;
  clearRecents: () => void;
}

function loadFromStorage(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}

function saveToStorage(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function useModelPreferences(): ModelPreferences {
  const [favorites, setFavorites] = useState<string[]>(() => loadFromStorage(FAVORITES_KEY));
  const [recents, setRecents] = useState<string[]>(() => loadFromStorage(RECENTS_KEY));

  // Sync favorites to localStorage
  useEffect(() => {
    saveToStorage(FAVORITES_KEY, favorites);
  }, [favorites]);

  // Sync recents to localStorage
  useEffect(() => {
    saveToStorage(RECENTS_KEY, recents);
  }, [recents]);

  const toggleFavorite = useCallback((modelId: string) => {
    setFavorites((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      return [...prev, modelId];
    });
  }, []);

  const isFavorite = useCallback(
    (modelId: string) => favorites.includes(modelId),
    [favorites]
  );

  const addRecent = useCallback((modelId: string) => {
    setRecents((prev) => {
      // Remove if already exists, then add to front
      const filtered = prev.filter((id) => id !== modelId);
      const updated = [modelId, ...filtered];
      // Keep only MAX_RECENTS items
      return updated.slice(0, MAX_RECENTS);
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
  }, []);

  return {
    favorites,
    recents,
    toggleFavorite,
    isFavorite,
    addRecent,
    clearRecents,
  };
}
