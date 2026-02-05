import { useEffect, useRef, useState } from 'react';

import { Bell, WifiOff } from 'lucide-react';

import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotificationSocket } from '@/lib/contexts/notification-socket-context';
import { useUnreadNotificationCount } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils/cn';

/**
 * Custom hook to detect when notification count increases.
 * Returns true for 3 seconds after count increases.
 * Uses state-based tracking with deferred setState for React Compiler compliance.
 */
function useNewNotificationIndicator(count: number): boolean {
  const [isNew, setIsNew] = useState(false);
  const countRef = useRef(count);

  // Detect count increase - use setTimeout to defer setState (React Compiler requires async)
  useEffect(() => {
    const prevCount = countRef.current;
    countRef.current = count;

    if (count > prevCount) {
      // Defer setState to satisfy React Compiler's set-state-in-effect rule
      const timer = setTimeout(() => setIsNew(true), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [count]);

  // Clear indicator after timeout
  useEffect(() => {
    if (!isNew) return;

    const timer = setTimeout(() => setIsNew(false), 3000);
    return () => clearTimeout(timer);
  }, [isNew]);

  return isNew;
}

export function NotificationBell() {
  const { data } = useUnreadNotificationCount();
  const { isConnected } = useNotificationSocket();
  const count = data?.count ?? 0;
  const isNew = useNewNotificationIndicator(count);

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      data-testid="notification-bell"
      className="relative h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
    >
      <Bell
        className={cn(
          'h-5 w-5 transition-transform duration-500',
          isNew && 'animate-bounce text-primary'
        )}
      />
      <span className="sr-only">Powiadomienia</span>

      {count > 0 && (
        <Badge
          variant="destructive"
          className={cn(
            'absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] shadow-sm',
            isNew && 'animate-pulse'
          )}
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}

      {/* Connection status indicator */}
      {!isConnected && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-white"
          data-testid="notification-offline-indicator"
        >
          <WifiOff className="h-2.5 w-2.5" />
        </span>
      )}
    </Button>
  );

  return (
    <NotificationDropdown>
      {!isConnected ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{bellButton}</TooltipTrigger>
            <TooltipContent>
              <p>Brak połączenia real-time</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        bellButton
      )}
    </NotificationDropdown>
  );
}
