import { RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePWA } from '@/lib/hooks/use-pwa';
import { cn } from '@/lib/utils/cn';

interface UpdatePromptProps {
  className?: string;
}

export function UpdatePrompt({ className }: UpdatePromptProps) {
  const { needRefresh, updateServiceWorker, dismissUpdatePrompt } = usePWA();

  if (!needRefresh) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-medium">New version available</p>
          <p className="text-xs text-muted-foreground">
            Refresh to get the latest features and fixes
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="icon" onClick={dismissUpdatePrompt} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
          <Button size="sm" onClick={updateServiceWorker}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
