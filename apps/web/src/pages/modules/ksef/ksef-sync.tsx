import { useState } from 'react';

import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { KsefSessionExpiryBanner } from './components/ksef-session-expiry-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { KsefSyncDirection, KsefSyncResult } from '@/lib/api/endpoints/ksef';
import { useSyncKsefInvoices } from '@/lib/hooks/use-ksef';
import { formatDate } from '@/lib/utils/format-date';

export default function KsefSyncPage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  // Default 'both' — most users want a full reconciliation in one click.
  // Backend defaults to 'incoming' for backwards compatibility, but the UI
  // surfaces 'both' as the friendly default.
  const [direction, setDirection] = useState<KsefSyncDirection>('both');
  const [syncResult, setSyncResult] = useState<KsefSyncResult | null>(null);

  const isDateRangeInvalid = dateFrom && dateTo && dateFrom > dateTo;

  const syncMutation = useSyncKsefInvoices();

  const handleSync = () => {
    if (!dateFrom || !dateTo) return;
    setSyncResult(null);
    syncMutation.mutate(
      { dateFrom, dateTo, direction },
      { onSuccess: (data) => setSyncResult(data as KsefSyncResult) }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synchronizacja KSeF"
        description="Pobieranie i synchronizacja faktur z Krajowego Systemu e-Faktur"
        icon={<RefreshCw className="h-6 w-6" />}
      />

      <KsefSessionExpiryBanner />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Pobierz faktury z KSeF</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Podaj zakres dat i kierunek, aby pobrać faktury z KSeF.
          </p>
          <div className="space-y-2">
            <Label>Kierunek</Label>
            <div className="flex gap-2">
              {([
                { value: 'incoming', label: 'Przychodzące', hint: 'gdzie firma jest nabywcą' },
                { value: 'outgoing', label: 'Wychodzące', hint: 'gdzie firma jest sprzedawcą' },
                { value: 'both', label: 'Oba', hint: 'oba kierunki w jednym przebiegu' },
              ] satisfies Array<{ value: KsefSyncDirection; label: string; hint: string }>).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={direction === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDirection(opt.value)}
                  title={opt.hint}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: '7 dni', days: 7 },
              { label: '30 dni', days: 30 },
              { label: '90 dni', days: 90 },
            ].map((preset) => (
              <Button
                key={preset.days}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date().toISOString().split('T')[0];
                  const from = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setDateFrom(from);
                  setDateTo(to);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data od</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data do</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSync} disabled={!dateFrom || !dateTo || !!isDateRangeInvalid || syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Synchronizuj
          </Button>
          {isDateRangeInvalid && (
            <p className="text-sm text-destructive">Data &quot;od&quot; musi być wcześniejsza niż data &quot;do&quot;</p>
          )}
        </CardContent>
      </Card>

      {syncResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Wynik synchronizacji</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Znaleziono</p>
                <p className="text-2xl font-bold">{syncResult.totalFound}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nowe</p>
                <p className="text-2xl font-bold text-green-600">{syncResult.newInvoices}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zaktualizowane</p>
                <p className="text-2xl font-bold text-blue-600">{syncResult.updatedInvoices}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Błędy</p>
                <p className="text-2xl font-bold text-red-600">{syncResult.errors}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Zsynchronizowano: {formatDate(syncResult.syncedAt)}</p>
            {syncResult.failedInvoices && syncResult.failedInvoices.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Nieudane faktury:</p>
                <div className="max-h-48 overflow-y-auto rounded border">
                  {syncResult.failedInvoices.map((fi, i) => (
                    <div key={i} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-0">
                      <span className="font-mono">{fi.ksefNumber}</span>
                      <span className="text-muted-foreground">{fi.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {syncMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Nie udało się zsynchronizować faktur. Sprawdź konfigurację KSeF.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
