import { Users, Package } from 'lucide-react';

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
        <h1 className="text-3xl font-bold tracking-tight text-apptax-navy">Panel Firmy</h1>
        <p className="text-muted-foreground mt-2">Przegląd Twojej firmy i pracowników</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pracownicy</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Users className="h-5 w-5 text-apptax-blue" />
              </div>
            </div>
            <CardDescription>Łączna liczba pracowników w Twojej firmie</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-apptax-blue">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dostępne moduły</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Package className="h-5 w-5 text-apptax-teal" />
              </div>
            </div>
            <CardDescription>Moduły włączone dla Twojej firmy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-apptax-blue">
                {modulesLoading ? '...' : modules?.length || 0}
              </p>
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="bg-apptax-gradient text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Zarządzaj swoją firmą</h2>
              <p className="text-white/80 max-w-xl">
                Dodawaj pracowników, konfiguruj uprawnienia i zarządzaj modułami firmy z tego
                panelu. Korzystaj z narzędzi księgowych wspieranych przez AI.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-2 text-apptax-teal">
                <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
                <span className="text-sm font-medium">Zasilane przez AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
