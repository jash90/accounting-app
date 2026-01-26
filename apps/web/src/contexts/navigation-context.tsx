/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface NavigationContextType {
  // Desktop sidebar state
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  // Mobile menu state
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isOpen,
        toggle,
        setOpen,
        isMobileMenuOpen,
        openMobileMenu,
        closeMobileMenu,
        toggleMobileMenu,
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

export function useMobileMenu() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useMobileMenu must be used within a NavigationProvider');
  }
  return {
    isOpen: context.isMobileMenuOpen,
    open: context.openMobileMenu,
    close: context.closeMobileMenu,
    toggle: context.toggleMobileMenu,
  };
}
