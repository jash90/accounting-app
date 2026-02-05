import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Bell, Calendar, Cog, Settings } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';

export default function SettlementsSettingsPage() {
  const navigate = useNavigate();
  const basePath = useModuleBasePath('settlements');

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
      />

      {/* Placeholder Card */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-apptax-teal" />
            <CardTitle className="text-lg">Ustawienia w przygotowaniu</CardTitle>
          </div>
          <CardDescription>Funkcje konfiguracyjne są obecnie w fazie rozwoju</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-apptax-soft-teal">
              <Settings className="h-8 w-8 text-apptax-teal" />
            </div>
            <p className="text-apptax-navy font-medium">Ustawienia modułu będą dostępne wkrótce</p>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
              W przyszłych aktualizacjach będzie można skonfigurować powiadomienia, automatyczne
              przypisywanie rozliczeń oraz domyślne wartości.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future Features Preview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-apptax-soft-teal/30 border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Powiadomienia</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Konfiguracja powiadomień email o statusach rozliczeń i terminach
            </p>
          </CardContent>
        </Card>

        <Card className="border-apptax-soft-teal/30 border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cog className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Automatyzacja</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Reguły automatycznego przypisywania rozliczeń do pracowników
            </p>
          </CardContent>
        </Card>

        <Card className="border-apptax-soft-teal/30 border-dashed opacity-60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Domyślne wartości</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Ustawienie domyślnych terminów i priorytetów dla nowych rozliczeń
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
