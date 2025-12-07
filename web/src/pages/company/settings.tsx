import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanySettings, useUpdateCompanySettings } from '@/lib/hooks/use-company-settings';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Settings, Mail, Save } from 'lucide-react';

export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isPending: isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [notificationEmail, setNotificationEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.notificationFromEmail || '');
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      notificationFromEmail: notificationEmail || undefined,
    });
  };

  const hasChanges = settings?.notificationFromEmail !== notificationEmail;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/company')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
        <PageHeader
          title="Ustawienia firmy"
          description="Konfiguracja powiadomień email i innych ustawień"
          icon={<Settings className="h-6 w-6" />}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Powiadomienia email
            </CardTitle>
            <CardDescription>
              Skonfiguruj adres email nadawcy używany do wysyłania powiadomień o nowych użytkownikach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notificationEmail">
                Adres email nadawcy powiadomień
              </Label>
              <Input
                id="notificationEmail"
                type="email"
                placeholder="np. powiadomienia@twoja-firma.pl"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Ten adres będzie widoczny jako nadawca powiadomień o dodaniu nowych pracowników.
                Jeśli nie zostanie ustawiony, zostanie użyty domyślny adres systemowy.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettings.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
