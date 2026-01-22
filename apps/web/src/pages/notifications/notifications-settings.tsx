import { useMemo, useState } from 'react';

import { Navigate } from 'react-router-dom';

import { Save } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useNotificationSettings,
  useUpdateGlobalNotificationSettings,
} from '@/lib/hooks/use-notifications';
import {
  getModuleFromNotificationType,
  type NotificationSettingsResponseDto,
  NotificationType,
  NotificationTypeLabels,
  type NotificationTypePreference,
} from '@/types/notifications';

interface NotificationSettingsData {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  typePreferences: Record<string, NotificationTypePreference>;
}

/**
 * Combines multiple module settings into a single unified view.
 * Takes the most permissive setting (if any module has a channel enabled, it's enabled).
 */
function combineSettings(
  settingsArray: NotificationSettingsResponseDto[]
): NotificationSettingsData {
  if (settingsArray.length === 0) {
    return { inAppEnabled: true, emailEnabled: true, typePreferences: {} };
  }

  // Use first module's global settings as baseline (they should all be the same after global update)
  const firstSetting = settingsArray[0];
  const typePreferences: Record<string, NotificationTypePreference> = {};

  // Combine type preferences from all modules
  for (const setting of settingsArray) {
    if (setting.typePreferences) {
      Object.assign(typePreferences, setting.typePreferences);
    }
  }

  return {
    inAppEnabled: firstSetting.inAppEnabled,
    emailEnabled: firstSetting.emailEnabled,
    typePreferences,
  };
}

interface NotificationSettingsFormProps {
  settings: NotificationSettingsData;
}

function NotificationSettingsForm({ settings }: NotificationSettingsFormProps) {
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateGlobalNotificationSettings();

  const [inAppEnabled, setInAppEnabled] = useState(settings.inAppEnabled);
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [typePreferences, setTypePreferences] = useState<
    Record<string, NotificationTypePreference>
  >(settings.typePreferences || {});
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    updateSettings({
      inAppEnabled,
      emailEnabled,
      typePreferences: typePreferences as Record<NotificationType, NotificationTypePreference>,
    });
    setHasChanges(false);
  };

  const handleTypePreferenceChange = (
    type: string,
    channel: 'inApp' | 'email',
    checked: boolean
  ) => {
    setTypePreferences((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || { inApp: true, email: true }),
        [channel]: checked,
      },
    }));
    setHasChanges(true);
  };

  const handleGlobalToggle = (channel: 'inApp' | 'email', checked: boolean) => {
    if (channel === 'inApp') setInAppEnabled(checked);
    else setEmailEnabled(checked);
    setHasChanges(true);
  };

  const groupedTypes = Object.values(NotificationType).reduce(
    (acc, type) => {
      const module = getModuleFromNotificationType(type);
      if (!acc[module]) acc[module] = [];
      acc[module].push(type);
      return acc;
    },
    {} as Record<string, NotificationType[]>
  );

  const moduleLabels: Record<string, string> = {
    tasks: 'Zadania',
    clients: 'Klienci',
    'time-tracking': 'Czas pracy',
    'email-client': 'Poczta email',
    'ai-agent': 'Asystent AI',
    company: 'Firma i uprawnienia',
    system: 'System',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ustawienia powiadomień"
        description="Dostosuj sposób otrzymywania powiadomień."
        action={
          <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
            <Save className="mr-2 h-4 w-4" />
            Zapisz zmiany
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Ustawienia ogólne</CardTitle>
          <CardDescription>
            Włącz lub wyłącz powiadomienia globalnie dla wybranych kanałów.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="in-app-notifications">Powiadomienia w aplikacji</Label>
              <p className="text-sm text-muted-foreground">
                Wyświetlaj powiadomienia w panelu aplikacji.
              </p>
            </div>
            <Switch
              id="in-app-notifications"
              checked={inAppEnabled}
              onCheckedChange={(c) => handleGlobalToggle('inApp', c)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Powiadomienia email</Label>
              <p className="text-sm text-muted-foreground">
                Otrzymuj powiadomienia na adres email.
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailEnabled}
              onCheckedChange={(c) => handleGlobalToggle('email', c)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Szczegółowe ustawienia powiadomień</CardTitle>
          <CardDescription>
            Wybierz jakie powiadomienia chcesz otrzymywać dla poszczególnych zdarzeń.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groupedTypes).map(([module, types]) => (
              <div key={module} className="space-y-4">
                <h3 className="text-lg font-medium tracking-tight">
                  {moduleLabels[module] || module}
                </h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 gap-4 bg-muted/50 p-4 text-sm font-medium">
                    <div className="col-span-8">Typ zdarzenia</div>
                    <div className="col-span-2 text-center">W aplikacji</div>
                    <div className="col-span-2 text-center">Email</div>
                  </div>
                  <div className="divide-y">
                    {types.map((type) => {
                      const pref = typePreferences[type] || { inApp: true, email: true };
                      return (
                        <div key={type} className="grid grid-cols-12 gap-4 p-4 items-center">
                          <div className="col-span-8 text-sm">
                            {NotificationTypeLabels[type as NotificationType] || type}
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <Checkbox
                              checked={pref.inApp}
                              onCheckedChange={(c) =>
                                handleTypePreferenceChange(type, 'inApp', c as boolean)
                              }
                              disabled={!inAppEnabled}
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <Checkbox
                              checked={pref.email}
                              onCheckedChange={(c) =>
                                handleTypePreferenceChange(type, 'email', c as boolean)
                              }
                              disabled={!emailEnabled}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthContext();
  const { data: settingsArray, isPending } = useNotificationSettings();

  // Combine array of module settings into unified view
  const combinedSettings = useMemo(() => {
    if (!settingsArray || settingsArray.length === 0) return null;
    return combineSettings(settingsArray);
  }, [settingsArray]);

  // Redirect unauthenticated users to login
  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading state while auth is being verified
  if (isAuthLoading || isPending || !combinedSettings || !user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ustawienia powiadomień" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NotificationSettingsForm
      key={combinedSettings ? JSON.stringify(combinedSettings) : 'loading'}
      settings={combinedSettings}
    />
  );
}
