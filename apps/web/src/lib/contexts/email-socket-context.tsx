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

import { useAuthContext } from '@/contexts/auth-context';
import { tokenStorage } from '@/lib/auth/token-storage';
import { useQueryClient } from '@tanstack/react-query';
import type { io as ioType, Socket } from 'socket.io-client';

import { useToast } from '@/components/ui/use-toast';

const loadSocketIo = () => import('socket.io-client');

const getWsBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.WS_URL) {
    const url = window.__APP_CONFIG__.WS_URL;
    if (url && url !== '__WS_URL__') return url;
  }
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) {
    const url = window.__APP_CONFIG__.API_BASE_URL;
    if (url && url !== '__API_BASE_URL__') return url;
  }
  if (import.meta.env.DEV) {
    return (
      import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    );
  }
  return '';
};

const isEmailInboxQuery = (query: { queryKey: unknown }): boolean => {
  const key = query.queryKey;
  return Array.isArray(key) && (key[0] === 'email-inbox' || key[0] === 'email-inbox-infinite');
};

interface EmailSocketContextValue {
  isConnected: boolean;
}

const EmailSocketContext = createContext<EmailSocketContextValue | null>(null);

export function EmailSocketProvider({ children }: { children: ReactNode }) {
  'use no memo';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthContext();

  const queryClientRef = useRef(queryClient);
  const toastRef = useRef(toast);

  useEffect(() => {
    queryClientRef.current = queryClient;
    toastRef.current = toast;
  }, [queryClient, toast]);

  const userId = user?.id;

  const socketModuleRef = useRef<Promise<{ io: typeof ioType }> | null>(null);
  const getSocketModule = useCallback(() => {
    if (!socketModuleRef.current) {
      socketModuleRef.current = loadSocketIo();
    }
    return socketModuleRef.current;
  }, []);

  const createSocket = useCallback(async (): Promise<Socket | null> => {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) return null;
    const { io } = await getSocketModule();
    return io(`${getWsBaseUrl()}/email`, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, [getSocketModule]);

  useEffect(() => {
    const accessToken = tokenStorage.getAccessToken();

    if (!accessToken || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    let isCancelled = false;

    (async () => {
      const socketInstance = await createSocket();
      if (!socketInstance || isCancelled) return;

      socketInstance.on('connect', () => {
        if (isCancelled) return;
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        if (isCancelled) return;
        setIsConnected(false);
      });

      socketInstance.on('email:new', () => {
        if (isCancelled) return;
        queryClientRef.current.invalidateQueries({ predicate: isEmailInboxQuery });
        toastRef.current({
          title: 'Nowa wiadomość',
          description: 'Otrzymałeś nową wiadomość email',
          duration: 5000,
        });
      });

      socketInstance.on('connect_error', () => {
        if (isCancelled) return;
        setIsConnected(false);
      });

      socketRef.current = socketInstance;
    })();

    return () => {
      isCancelled = true;
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('email:new');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, createSocket]);

  const contextValue = useMemo(() => ({ isConnected }), [isConnected]);

  return <EmailSocketContext.Provider value={contextValue}>{children}</EmailSocketContext.Provider>;
}

export function useEmailSocket() {
  const context = use(EmailSocketContext);
  if (!context) {
    throw new Error('useEmailSocket must be used within an EmailSocketProvider');
  }
  return context;
}
