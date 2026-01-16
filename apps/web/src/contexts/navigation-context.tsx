import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const STORAGE_KEY = 'accounting-sidebar-state';

function getInitialState(): boolean {
  // SSR safety check
  if (typeof window === 'undefined') {
    return true; // Default to open on server
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : true;
  } catch {
    return true; // Default to open if parsing fails
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(getInitialState);

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isOpen));
      } catch (error) {
        console.error('Failed to save sidebar state:', error);
      }
    }
  }, [isOpen]);

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        try {
          setIsOpen(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggle = () => {
    setIsOpen((prev) => !prev);
  };

  const setOpen = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <NavigationContext.Provider
      value={{
        isOpen,
        toggle,
        setOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a NavigationProvider');
  }
  return context;
}
