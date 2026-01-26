import { PageHeader } from '@/components/common/page-header';
import { ThemeModeToggle, ThemeSelector } from '@/components/theme';
import { Monitor, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Wygląd"
        description="Dostosuj wygląd aplikacji do swoich preferencji"
        icon={<Palette className="h-6 w-6" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Color Mode Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="text-primary h-5 w-5" />
              <CardTitle>Tryb kolorów</CardTitle>
            </div>
            <CardDescription>
              Wybierz jasny, ciemny lub automatyczny tryb wyświetlania
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeModeToggle />
          </CardContent>
        </Card>

        {/* Theme Selection Section - spans full width on larger screens */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="text-primary h-5 w-5" />
              <CardTitle>Motyw</CardTitle>
            </div>
            <CardDescription>
              Wybierz schemat kolorów aplikacji. Podgląd pokazuje kolory dla aktualnego trybu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
