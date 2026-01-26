import { useCallback, useEffect, useState } from 'react';

import { useRegisterSW } from 'virtual:pwa-register/react';

interface UsePWAReturn {
  // Service worker state
  needRefresh: boolean;
  offlineReady: boolean;
  // Install state
  canInstall: boolean;
  isInstalled: boolean;
  // Actions
  updateServiceWorker: () => void;
  promptInstall: () => Promise<void>;
  dismissInstallPrompt: () => void;
  dismissUpdatePrompt: () => void;
  dismissOfflineReady: () => void;
}

function getInitialIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function usePWA(): UsePWAReturn {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getInitialIsInstalled);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Check for updates periodically
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        ); // Check every hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    setCanInstall(false);
  }, []);

  const dismissUpdatePrompt = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  const handleUpdateServiceWorker = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    needRefresh,
    offlineReady,
    canInstall,
    isInstalled,
    updateServiceWorker: handleUpdateServiceWorker,
    promptInstall,
    dismissInstallPrompt,
    dismissUpdatePrompt,
    dismissOfflineReady,
  };
}
