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

import { useQueryClient } from '@tanstack/react-query';
import type { io as ioType, Socket } from 'socket.io-client';

import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import { queryKeys } from '@/lib/api/query-client';
import { tokenStorage } from '@/lib/auth/token-storage';
import type { NotificationResponseDto } from '@/types/notifications';


// Window.__APP_CONFIG__ is declared in lib/api/client.ts

/**
 * Get WebSocket base URL with runtime config support for Railway deployment.
 * Priority: Runtime config (Railway) > Build-time env var (DEV only) > API URL fallback > localhost
 */
const getWsBaseUrl = (): string => {
  // Runtime config (injected by Railway at deploy time)
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.WS_URL) {
    const url = window.__APP_CONFIG__.WS_URL;
    if (url && url !== '__WS_URL__') {
      return url;
    }
  }

  // Runtime API URL - WebSocket usually runs on same server
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) {
    const url = window.__APP_CONFIG__.API_BASE_URL;
    if (url && url !== '__API_BASE_URL__') {
      return url;
    }
  }

  // Build-time env var - ONLY for local development
  if (import.meta.env.DEV) {
    return (
      import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    );
  }

  // Production fallback - use relative URL (same origin)
  return '';
};

interface NotificationSocketContextValue {
  isConnected: boolean;
  lastNotification: NotificationResponseDto | null;
}

const NotificationSocketContext = createContext<NotificationSocketContextValue | null>(null);

interface NotificationSocketProviderProps {
  children: ReactNode;
}

export function NotificationSocketProvider({ children }: NotificationSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationResponseDto | null>(null);
  const disconnectToastShownRef = useRef(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthContext();

  // Store queryClient and toast in refs to maintain stable handler references
  // This prevents socket listener accumulation caused by handlers being recreated
  const queryClientRef = useRef(queryClient);
  const toastRef = useRef(toast);

  // Keep refs in sync with current values - use explicit dependencies
  useEffect(() => {
    queryClientRef.current = queryClient;
    toastRef.current = toast;
  }, [queryClient, toast]);

  // Batch notification invalidations to prevent cache invalidation storms
  // when multiple notifications arrive rapidly
  const pendingInvalidations = useRef(new Set<string>());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushInvalidations = useCallback(() => {
    // Clear any existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    // Debounce: wait 100ms before flushing to batch rapid notifications
    flushTimeoutRef.current = setTimeout(() => {
      const qc = queryClientRef.current;
      if (pendingInvalidations.current.has('notifications')) {
        qc.invalidateQueries({
          queryKey: queryKeys.notifications.all,
          exact: false,
        });
      }
      if (pendingInvalidations.current.has('unreadCount')) {
        qc.invalidateQueries({
          queryKey: queryKeys.notifications.unreadCount,
        });
      }
      pendingInvalidations.current.clear();
      flushTimeoutRef.current = null;
    }, 100);
  }, []);

  // Stable user ID for dependency tracking - prevents full user object comparison
  const userId = user?.id;

  // Cache socket.io-client module promise to avoid duplicate imports
  // Single import used for both preload and actual connection
  const socketModuleRef = useRef<Promise<{ io: typeof ioType }> | null>(null);

  // Get or create the socket module promise (lazy singleton)
  const getSocketModule = useCallback(() => {
    if (!socketModuleRef.current) {
      socketModuleRef.current = import('socket.io-client');
    }
    return socketModuleRef.current;
  }, []);

  // Preload socket.io-client once auth is confirmed to reduce delay when connecting
  // This starts loading the module in parallel while user interacts with the app
  useEffect(() => {
    if (userId && !socketRef.current) {
      // Preload socket.io-client module (non-blocking)
      void getSocketModule();
    }
  }, [userId, getSocketModule]);

  // Create socket connection with proper race condition handling
  // Uses the cached module promise to avoid duplicate imports
  const createSocket = useCallback(async (): Promise<Socket | null> => {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) return null;

    // Use cached module promise - only loads socket.io-client once
    const { io } = await getSocketModule();

    return io(`${getWsBaseUrl()}/notifications`, {
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, [getSocketModule]);

  useEffect(() => {
    // Get fresh token on each effect run to handle token refresh
    const accessToken = tokenStorage.getAccessToken();

    // Clean up existing socket if user logs out or token is missing
    if (!accessToken || !userId) {
      if (socketRef.current) {
        // Disconnect will trigger the 'disconnect' event handler which sets isConnected to false
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Socket already exists and is connected - no need to recreate
    if (socketRef.current?.connected) {
      return;
    }

    // Disconnect existing socket if it exists but isn't connected (e.g., after token refresh)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Race condition flag - prevents setting state after cleanup
    let isCancelled = false;

    // Async IIFE for dynamic import
    (async () => {
      const socketInstance = await createSocket();
      if (!socketInstance || isCancelled) return;

      socketInstance.on('connect', () => {
        if (isCancelled) return;
        setIsConnected(true);
        // Show reconnection success toast only if we previously showed a disconnect toast
        if (disconnectToastShownRef.current) {
          toastRef.current({
            title: 'Połączono',
            description: 'Połączenie real-time zostało przywrócone',
            duration: 3000,
          });
          disconnectToastShownRef.current = false;
        }
      });

      socketInstance.on('disconnect', (reason) => {
        if (isCancelled) return;
        setIsConnected(false);
        // Show disconnect toast only once and only for unexpected disconnects
        // Don't show toast for intentional disconnects (like logout)
        if (!disconnectToastShownRef.current && reason !== 'io client disconnect') {
          toastRef.current({
            title: 'Połączenie utracone',
            description: 'Próba ponownego połączenia...',
            variant: 'destructive',
            duration: 5000,
          });
          disconnectToastShownRef.current = true;
        }
      });

      // Handler for new notifications - uses refs for stable reference
      // Batches cache invalidations to prevent storms when multiple notifications arrive
      socketInstance.on('notification:new', (notification: NotificationResponseDto) => {
        if (isCancelled) return;
        try {
          setLastNotification(notification);

          // Batch invalidations - will be flushed after 100ms of inactivity
          pendingInvalidations.current.add('notifications');
          pendingInvalidations.current.add('unreadCount');
          flushInvalidations();

          toastRef.current({
            title: notification.title,
            description: notification.message || undefined,
            duration: 5000,
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error handling new notification:', error);
          }
        }
      });

      // Handler for notification read - uses refs for stable reference
      // Batches cache invalidations to prevent storms
      socketInstance.on('notification:read', (payload: { id: string }) => {
        if (isCancelled) return;
        try {
          // Detail query invalidation is immediate (specific to one notification)
          queryClientRef.current.invalidateQueries({
            queryKey: queryKeys.notifications.detail(payload.id),
          });

          // Batch the list invalidations
          pendingInvalidations.current.add('notifications');
          pendingInvalidations.current.add('unreadCount');
          flushInvalidations();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error handling notification read:', error);
          }
        }
      });

      socketInstance.on('connect_error', (error) => {
        if (isCancelled) return;
        if (import.meta.env.DEV) {
          console.error('WebSocket connection error:', error);
        }
        setIsConnected(false);
      });

      socketInstance.io.on('reconnect_failed', () => {
        if (isCancelled) return;
        if (import.meta.env.DEV) {
          console.error('WebSocket reconnection failed after all attempts');
        }
        toastRef.current({
          title: 'Nie można połączyć z serwerem',
          description: 'Odśwież stronę, aby ponowić próbę połączenia',
          variant: 'destructive',
          duration: 10000,
        });
      });

      socketRef.current = socketInstance;
    })();

    // Capture ref values before cleanup to avoid stale ref warnings
    const currentPendingInvalidations = pendingInvalidations.current;

    return () => {
      isCancelled = true;
      // Clear any pending flush timeout to prevent memory leaks
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      currentPendingInvalidations.clear();

      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('notification:new');
        socketRef.current.off('notification:read');
        socketRef.current.off('connect_error');
        socketRef.current.io.off('reconnect_failed');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, createSocket, flushInvalidations]); // Use userId instead of full user object

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({ isConnected, lastNotification }),
    [isConnected, lastNotification]
  );

  return (
    <NotificationSocketContext.Provider value={contextValue}>
      {children}
    </NotificationSocketContext.Provider>
  );
}

export function useNotificationSocket() {
  const context = use(NotificationSocketContext);
  if (!context) {
    throw new Error('useNotificationSocket must be used within a NotificationSocketProvider');
  }
  return context;
}
