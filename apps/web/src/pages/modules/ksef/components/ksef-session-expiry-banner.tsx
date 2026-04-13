import { useEffect, useState } from 'react';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useKsefActiveSession } from '@/lib/hooks/use-ksef';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function KsefSessionExpiryBanner() {
  const { data: activeSession } = useKsefActiveSession();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!activeSession?.expiresAt) return null;

  const expiresAt = new Date(activeSession.expiresAt).getTime();
  const remaining = expiresAt - now;

  if (remaining > FIVE_MINUTES_MS || remaining <= 0) return null;

  const minutes = Math.max(0, Math.ceil(remaining / 60_000));

  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        Sesja KSeF wygasa za {minutes} min. Zakończ operacje lub otwórz nową sesję.
      </AlertDescription>
    </Alert>
  );
}
