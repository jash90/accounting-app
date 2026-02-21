import { Package, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees } from '@/lib/hooks/use-employees';
import { useCompanyModules } from '@/lib/hooks/use-permissions';

export default function CompanyDashboard() {
  const { data: employees, isPending: employeesLoading } = useEmployees();
  const { data: modules, isPending: modulesLoading } = useCompanyModules();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Panel Firmy</h1>
        <p className="text-muted-foreground mt-2">Przegląd Twojej firmy i pracowników</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pracownicy</CardTitle>
              <div className="bg-accent/10 rounded-lg p-2">
                <Users className="text-primary h-5 w-5" />
              </div>
            </div>
            <CardDescription>Łączna liczba pracowników w Twojej firmie</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-primary text-4xl font-bold">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dostępne moduły</CardTitle>
              <div className="bg-accent/10 rounded-lg p-2">
                <Package className="text-accent h-5 w-5" />
              </div>
            </div>
            <CardDescription>Moduły włączone dla Twojej firmy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-primary text-4xl font-bold">
                {modulesLoading ? '...' : modules?.length || 0}
              </p>
              <div className="bg-accent ai-glow h-2 w-2 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="bg-primary border-0 text-white">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold">Zarządzaj swoją firmą</h2>
              <p className="max-w-xl text-white/80">
                Dodawaj pracowników, konfiguruj uprawnienia i zarządzaj modułami firmy z tego
                panelu. Korzystaj z narzędzi księgowych wspieranych przez AI.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-accent flex items-center gap-2">
                <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
                <span className="text-sm font-medium">Zasilane przez AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
