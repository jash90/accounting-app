import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface NavigationContextType {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Versioned storage key to allow schema migrations
// Increment version when storage format changes to force reset
const STORAGE_VERSION = 1;
const STORAGE_KEY = `accounting-sidebar-state-v${STORAGE_VERSION}`;

// Legacy key for migration
const LEGACY_STORAGE_KEY = 'accounting-sidebar-state';

interface StoredSidebarState {
  version: number;
  isOpen: boolean;
}

function getInitialState(): boolean {
  // SSR safety check
  if (typeof window === 'undefined') {
    return true; // Default to open on server
  }

  try {
    // Try versioned key first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as StoredSidebarState;
      // Validate schema
      if (parsed.version === STORAGE_VERSION && typeof parsed.isOpen === 'boolean') {
        return parsed.isOpen;
      }
    }

    // Migrate from legacy key if exists
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) {
      const isOpen = JSON.parse(legacy) as boolean;
      // Clean up legacy key
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      // Save to versioned key
      const newState: StoredSidebarState = { version: STORAGE_VERSION, isOpen };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return isOpen;
    }

    return true; // Default to open
  } catch {
    return true; // Default to open if parsing fails
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  'use no memo';
  const [isOpen, setIsOpen] = useState<boolean>(getInitialState);

  // Persist state to localStorage with versioning
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const state: StoredSidebarState = { version: STORAGE_VERSION, isOpen };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to save sidebar state:', error);
        }
      }
    }
  }, [isOpen]);

  // Cache storage event handler in ref to avoid recreation on each render
  const handleStorageChangeRef = useRef<((e: StorageEvent) => void) | null>(null);

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create handler only once and cache in ref
    if (!handleStorageChangeRef.current) {
      handleStorageChangeRef.current = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue !== null) {
          try {
            const parsed = JSON.parse(e.newValue) as StoredSidebarState;
            if (parsed.version === STORAGE_VERSION && typeof parsed.isOpen === 'boolean') {
              setIsOpen(parsed.isOpen);
            }
          } catch {
            // Ignore parse errors
          }
        }
      };
    }

    window.addEventListener('storage', handleStorageChangeRef.current);
    return () => {
      if (handleStorageChangeRef.current) {
        window.removeEventListener('storage', handleStorageChangeRef.current);
      }
    };
  }, []);

  // Memoize callbacks to prevent recreation on every render
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      isOpen,
      toggle,
      setOpen,
    }),
    [isOpen, toggle, setOpen]
  );

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
}

export function useSidebar() {
  const context = use(NavigationContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a NavigationProvider');
  }
  return context;
}
