import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface OffersErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
}

/**
 * Error fallback component for offers module.
 * Displays user-friendly error message with retry option.
 * Polish language to match the rest of the offers module.
 */
export function OffersErrorFallback({
  error,
  resetError,
  title = 'Wystąpił błąd',
  description,
}: OffersErrorFallbackProps) {
  const errorMessage =
    description ||
    (error?.message && error.message !== 'undefined'
      ? error.message
      : 'Nie udało się załadować danych. Spróbuj odświeżyć stronę.');

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
        </div>
        {resetError && (
          <Button onClick={resetError} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Spróbuj ponownie
          </Button>
        )}
        {import.meta.env.DEV && error && (
          <details className="text-muted-foreground text-left text-xs">
            <summary className="cursor-pointer">Szczegóły techniczne</summary>
            <pre className="bg-muted mt-2 overflow-auto rounded p-2">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
