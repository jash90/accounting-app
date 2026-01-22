import { useEffect, useRef, useState } from 'react';

import { Bell, WifiOff } from 'lucide-react';

import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotificationSocket } from '@/lib/contexts/notification-socket-context';
import { useUnreadNotificationCount } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils/cn';

export function NotificationBell() {
  const { data } = useUnreadNotificationCount();
  const { isConnected } = useNotificationSocket();
  const count = data?.count ?? 0;
  const prevCountRef = useRef(count);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (count > prevCountRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Detecting count increase requires immediate state update
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 3000);
      prevCountRef.current = count;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
    return undefined;
  }, [count]);

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      data-testid="notification-bell"
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
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
