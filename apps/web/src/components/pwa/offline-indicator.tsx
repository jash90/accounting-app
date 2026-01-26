import { WifiOff } from 'lucide-react';

import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { cn } from '@/lib/utils/cn';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-destructive-foreground',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">
        You are offline. Some features may be unavailable.
      </span>
    </div>
  );
}
