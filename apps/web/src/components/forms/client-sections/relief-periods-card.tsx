import { AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export interface ReliefPeriodsCardProps {
  // Ulga na start
  ulgaNaStartEnabled: boolean;
  ulgaNaStartStartDate: Date | undefined;
  ulgaNaStartEndDate: Date | undefined;
  onUlgaNaStartEnabledChange: (enabled: boolean) => void;
  onUlgaNaStartStartDateChange: (date: Date | undefined) => void;
  onUlgaNaStartEndDateChange: (date: Date | undefined) => void;
  // Maly ZUS
  malyZusEnabled: boolean;
  malyZusStartDate: Date | undefined;
  malyZusEndDate: Date | undefined;
  onMalyZusEnabledChange: (enabled: boolean) => void;
  onMalyZusStartDateChange: (date: Date | undefined) => void;
  onMalyZusEndDateChange: (date: Date | undefined) => void;
}

/**
 * Relief Periods Card - Ulga na Start and Maly ZUS configuration
 */
export function ReliefPeriodsCard({
  ulgaNaStartEnabled,
  ulgaNaStartStartDate,
  ulgaNaStartEndDate,
  onUlgaNaStartEnabledChange,
  onUlgaNaStartStartDateChange,
  onUlgaNaStartEndDateChange,
  malyZusEnabled,
  malyZusStartDate,
  malyZusEndDate,
  onMalyZusEnabledChange,
  onMalyZusStartDateChange,
  onMalyZusEndDateChange,
}: ReliefPeriodsCardProps) {
  const handleUlgaNaStartToggle = (checked: boolean) => {
    onUlgaNaStartEnabledChange(checked);
    if (!checked) {
      onUlgaNaStartStartDateChange(undefined);
      onUlgaNaStartEndDateChange(undefined);
    }
  };

  const handleMalyZusToggle = (checked: boolean) => {
    onMalyZusEnabledChange(checked);
    if (!checked) {
      onMalyZusStartDateChange(undefined);
      onMalyZusEndDateChange(undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ulgi i preferencje ZUS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ulga na start */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="ulga-na-start-switch" className="text-sm font-medium">
                Ulga na start
              </label>
              <p className="text-muted-foreground text-xs">
                Zwolnienie ze skladek ZUS na 6 miesiecy
              </p>
            </div>
            <Switch
              id="ulga-na-start-switch"
              checked={ulgaNaStartEnabled}
              onCheckedChange={handleUlgaNaStartToggle}
            />
          </div>

          {ulgaNaStartEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label htmlFor="ulga-na-start-start-date" className="text-sm font-medium">
                  Data rozpoczecia *
                </label>
                <Input
                  id="ulga-na-start-start-date"
                  type="date"
                  value={
                    ulgaNaStartStartDate ? ulgaNaStartStartDate.toISOString().split('T')[0] : ''
                  }
                  onChange={(e) =>
                    onUlgaNaStartStartDateChange(
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ulga-na-start-end-date" className="text-sm font-medium">
                  Data zakonczenia
                </label>
                <Input
                  id="ulga-na-start-end-date"
                  type="date"
                  value={ulgaNaStartEndDate ? ulgaNaStartEndDate.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    onUlgaNaStartEndDateChange(
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Automatycznie obliczone: 6 miesiecy od daty rozpoczecia
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Maly ZUS */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="maly-zus-switch" className="text-sm font-medium">
                Maly ZUS (Maly ZUS Plus)
              </label>
              <p className="text-muted-foreground text-xs">Nizsze skladki ZUS na 36 miesiecy</p>
            </div>
            <Switch
              id="maly-zus-switch"
              checked={malyZusEnabled}
              onCheckedChange={handleMalyZusToggle}
            />
          </div>

          {malyZusEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label htmlFor="maly-zus-start-date" className="text-sm font-medium">
                  Data rozpoczecia *
                </label>
                <Input
                  id="maly-zus-start-date"
                  type="date"
                  value={malyZusStartDate ? malyZusStartDate.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    onMalyZusStartDateChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="maly-zus-end-date" className="text-sm font-medium">
                  Data zakonczenia
                </label>
                <Input
                  id="maly-zus-end-date"
                  type="date"
                  value={malyZusEndDate ? malyZusEndDate.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    onMalyZusEndDateChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Automatycznie obliczone: 36 miesiecy od daty rozpoczecia
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info box about notifications */}
        {(ulgaNaStartEnabled || malyZusEnabled) && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium">Powiadomienia o wygasnieciu</p>
              <p className="mt-0.5">
                System wysle przypomnienia 7 dni i 1 dzien przed data zakonczenia ulgi do wszystkich
                pracownikow i wlasciciela firmy.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
