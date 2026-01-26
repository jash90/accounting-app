import { useEffect, useState, useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true; // SSR always assumes online
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to track if the app just came back online
 */
export function useWentOnline(): boolean {
  const [wentOnline, setWentOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setWentOnline(true);
      setTimeout(() => setWentOnline(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return wentOnline;
}
