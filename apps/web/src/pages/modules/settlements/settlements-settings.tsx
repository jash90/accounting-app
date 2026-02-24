import { useEffect, useReducer } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Bell, Cog, Save, Settings, Users } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { type UpdateSettlementSettingsDto } from '@/lib/api/endpoints/settlements';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useAllAssignableUsers,
  useSettlementSettings,
  useUpdateSettlementSettings,
} from '@/lib/hooks/use-settlements';

type SettingsState = {
  defaultPriority: number;
  defaultDeadlineDay: string;
  autoAssignEnabled: boolean;
  notifyOnStatusChange: boolean;
  notifyOnDeadlineApproaching: boolean;
  deadlineWarningDays: number;
};

const initialFormState: SettingsState = {
  defaultPriority: 0,
  defaultDeadlineDay: '',
  autoAssignEnabled: false,
  notifyOnStatusChange: true,
  notifyOnDeadlineApproaching: true,
  deadlineWarningDays: 3,
};

function formReducer(state: SettingsState, update: Partial<SettingsState>): SettingsState {
  return { ...state, ...update };
}

function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((num) => (
        <Card key={num}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SettlementsSettingsPage() {
  'use no memo';
  const navigate = useNavigate();
  const basePath = useModuleBasePath('settlements');

  const { data: settings, isPending } = useSettlementSettings();
  const { data: assignableUsers } = useAllAssignableUsers();
  const updateSettings = useUpdateSettlementSettings();

  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const {
    defaultPriority,
    defaultDeadlineDay,
    autoAssignEnabled,
    notifyOnStatusChange,
    notifyOnDeadlineApproaching,
    deadlineWarningDays,
  } = formState;

  useEffect(() => {
    if (!settings) return;
    dispatch({
      defaultPriority: settings.defaultPriority,
      defaultDeadlineDay:
        settings.defaultDeadlineDay != null ? String(settings.defaultDeadlineDay) : '',
      autoAssignEnabled: settings.autoAssignEnabled,
      notifyOnStatusChange: settings.notifyOnStatusChange,
      notifyOnDeadlineApproaching: settings.notifyOnDeadlineApproaching,
      deadlineWarningDays: settings.deadlineWarningDays,
    });
  }, [settings]);

  const handleSave = () => {
    const deadlineDayNum = defaultDeadlineDay === '' ? null : parseInt(defaultDeadlineDay, 10);
    const dto: UpdateSettlementSettingsDto = {
      defaultPriority,
      defaultDeadlineDay: deadlineDayNum,
      autoAssignEnabled,
      notifyOnStatusChange,
      notifyOnDeadlineApproaching,
      deadlineWarningDays,
    };
    updateSettings.mutate(dto);
  };

  const priorityLabels: Record<number, string> = {
    0: 'Normalny',
    1: 'Wysoki',
    2: 'Pilny',
    3: 'Krytyczny',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do modułu
        </Button>
      </div>

      <PageHeader
        title="Ustawienia modułu Rozliczenia"
        description="Konfiguracja powiadomień, automatyzacji i domyślnych wartości"
        icon={<Settings className="h-6 w-6" />}
        action={
          <Button onClick={handleSave} disabled={updateSettings.isPending || isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateSettings.isPending ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </Button>
        }
      />

      {isPending ? (
        <SettingsFormSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Default Values */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cog className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Domyślne wartości</CardTitle>
              </div>
              <CardDescription>
                Domyślne ustawienia stosowane przy tworzeniu nowych rozliczeń
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultPriority">Domyślny priorytet</Label>
                  <Select
                    value={String(defaultPriority)}
                    onValueChange={(v) => dispatch({ defaultPriority: parseInt(v, 10) })}
                  >
                    <SelectTrigger id="defaultPriority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {priorityLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Priorytet przypisywany automatycznie do nowych rozliczeń
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultDeadlineDay">Domyślny termin (dzień miesiąca)</Label>
                  <Input
                    id="defaultDeadlineDay"
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Brak (zostaw puste)"
                    value={defaultDeadlineDay}
                    onChange={(e) => dispatch({ defaultDeadlineDay: e.target.value })}
                  />
                  <p className="text-muted-foreground text-xs">
                    Dzień miesiąca ustawiany jako termin rozliczenia (1–31). Zostaw puste, aby
                    wyłączyć.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Automation */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Automatyzacja</CardTitle>
              </div>
              <CardDescription>
                Reguły automatycznego przypisywania rozliczeń do pracowników
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAssignEnabled">Automatyczne przypisywanie</Label>
                  <p className="text-muted-foreground text-sm">
                    Automatycznie przypisuj rozliczenia na podstawie reguł klient–pracownik
                  </p>
                </div>
                <Switch
                  id="autoAssignEnabled"
                  checked={autoAssignEnabled}
                  onCheckedChange={(v) => dispatch({ autoAssignEnabled: v })}
                />
              </div>

              {autoAssignEnabled && assignableUsers && assignableUsers.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    Reguły przypisywania klientów do pracowników można zarządzać po włączeniu
                    automatyzacji. Dostępni pracownicy:{' '}
                    {assignableUsers
                      .map((u) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email)
                      .join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Powiadomienia</CardTitle>
              </div>
              <CardDescription>
                Konfiguracja powiadomień email o statusach rozliczeń i terminach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifyOnStatusChange">Powiadomienia o zmianie statusu</Label>
                  <p className="text-muted-foreground text-sm">
                    Wyślij powiadomienie email gdy status rozliczenia się zmieni
                  </p>
                </div>
                <Switch
                  id="notifyOnStatusChange"
                  checked={notifyOnStatusChange}
                  onCheckedChange={(v) => dispatch({ notifyOnStatusChange: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifyOnDeadlineApproaching">
                    Powiadomienia o zbliżającym się terminie
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Wyślij powiadomienie email gdy termin rozliczenia się zbliża
                  </p>
                </div>
                <Switch
                  id="notifyOnDeadlineApproaching"
                  checked={notifyOnDeadlineApproaching}
                  onCheckedChange={(v) => dispatch({ notifyOnDeadlineApproaching: v })}
                />
              </div>

              {notifyOnDeadlineApproaching && (
                <div className="space-y-2">
                  <Label htmlFor="deadlineWarningDays">Ostrzeżenie z wyprzedzeniem (dni)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="deadlineWarningDays"
                      type="number"
                      min={1}
                      max={14}
                      className="w-24"
                      value={deadlineWarningDays}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= 14) dispatch({ deadlineWarningDays: v });
                      }}
                    />
                    <span className="text-muted-foreground text-sm">dni przed terminem</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Ile dni przed terminem wysłać powiadomienie (1–14)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save button at bottom */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
