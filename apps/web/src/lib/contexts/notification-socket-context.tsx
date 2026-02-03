import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthContext } from '@/contexts/auth-context';
import { tokenStorage } from '@/lib/auth/token-storage';
import type { NotificationResponseDto } from '@/types/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { queryKeys } from '@/lib/api/query-client';
import { useToast } from '@/components/ui/use-toast';

// Extend Window interface for runtime config
declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
      WS_URL?: string;
    };
  }
}

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

  const handleNewNotification = useCallback(
    (notification: NotificationResponseDto) => {
      try {
        setLastNotification(notification);

        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });

        toast({
          title: notification.title,
          description: notification.message || undefined,
          duration: 5000,
        });
      } catch (error) {
        console.error('Error handling new notification:', error);
      }
    },
    [queryClient, toast]
  );

  const handleNotificationRead = useCallback(
    (payload: { id: string }) => {
      try {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.detail(payload.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      } catch (error) {
        console.error('Error handling notification read:', error);
      }
    },
    [queryClient]
  );

  useEffect(() => {
    // Get fresh token on each effect run to handle token refresh
    const accessToken = tokenStorage.getAccessToken();

    // Clean up existing socket if user logs out or token is missing
    if (!accessToken || !user) {
      if (socketRef.current) {
        // Disconnect will trigger the 'disconnect' event handler which sets isConnected to false
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // If socket exists and is connected, just re-register listeners with fresh callbacks
    // This prevents stale closure issues when dependencies change
    if (socketRef.current?.connected) {
      const existingSocket = socketRef.current;
      existingSocket.off('notification:new');
      existingSocket.off('notification:read');
      existingSocket.on('notification:new', handleNewNotification);
      existingSocket.on('notification:read', handleNotificationRead);
      return;
    }

    // Disconnect existing socket if it exists but isn't connected (e.g., after token refresh)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketInstance = io(`${getWsBaseUrl()}/notifications`, {
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Show reconnection success toast only if we previously showed a disconnect toast
      if (disconnectToastShownRef.current) {
        toast({
          title: 'Połączono',
          description: 'Połączenie real-time zostało przywrócone',
          duration: 3000,
        });
        disconnectToastShownRef.current = false;
      }
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      // Show disconnect toast only once and only for unexpected disconnects
      // Don't show toast for intentional disconnects (like logout)
      if (!disconnectToastShownRef.current && reason !== 'io client disconnect') {
        toast({
          title: 'Połączenie utracone',
          description: 'Próba ponownego połączenia...',
          variant: 'destructive',
          duration: 5000,
        });
        disconnectToastShownRef.current = true;
      }
    });

    socketInstance.on('notification:new', handleNewNotification);
    socketInstance.on('notification:read', handleNotificationRead);

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.io.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after all attempts');
      toast({
        title: 'Nie można połączyć z serwerem',
        description: 'Odśwież stronę, aby ponowić próbę połączenia',
        variant: 'destructive',
        duration: 10000,
      });
    });

    socketRef.current = socketInstance;

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('notification:new');
      socketInstance.off('notification:read');
      socketInstance.off('connect_error');
      socketInstance.io.off('reconnect_failed');
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [user, handleNewNotification, handleNotificationRead, toast]);

  return (
    <NotificationSocketContext.Provider value={{ isConnected, lastNotification }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}

export function useNotificationSocket() {
  const context = useContext(NotificationSocketContext);
  if (!context) {
    throw new Error('useNotificationSocket must be used within a NotificationSocketProvider');
  }
  return context;
}
