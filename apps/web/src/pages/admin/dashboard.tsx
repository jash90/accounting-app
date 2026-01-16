import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/lib/hooks/use-users';
import { useCompanies } from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';
import { Users, Building2, Package } from 'lucide-react';

export default function AdminDashboard() {
  const { data: users, isPending: usersLoading } = useUsers();
  const { data: companies, isPending: companiesLoading } = useCompanies();
  const { data: modules, isPending: modulesLoading } = useModules();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-apptax-navy">Panel Administratora</h1>
        <p className="text-muted-foreground mt-2">
          Przegląd statystyk systemowych i zarządzanie
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="users-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Wszyscy użytkownicy</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Users className="h-5 w-5 text-apptax-blue" />
              </div>
            </div>
            <CardDescription>Wszyscy użytkownicy w systemie</CardDescription>
          </CardHeader>
          <CardContent>
            <p data-testid="user-count" className="text-4xl font-bold text-apptax-blue">
              {usersLoading ? '...' : users?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="companies-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Wszystkie firmy</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Building2 className="h-5 w-5 text-apptax-blue" />
              </div>
            </div>
            <CardDescription>Zarejestrowane firmy</CardDescription>
          </CardHeader>
          <CardContent>
            <p data-testid="company-count" className="text-4xl font-bold text-apptax-blue">
              {companiesLoading ? '...' : companies?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="modules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Moduły</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Package className="h-5 w-5 text-apptax-teal" />
              </div>
            </div>
            <CardDescription>Dostępne moduły</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p data-testid="module-count" className="text-4xl font-bold text-apptax-blue">
                {modulesLoading ? '...' : modules?.length || 0}
              </p>
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="bg-apptax-dark-gradient text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Witaj w AppTax Admin</h2>
              <p className="text-white/80 max-w-xl">
                Zarządzaj firmami, użytkownikami i modułami z tego centralnego panelu.
                Monitoruj stan systemu i konfiguruj ustawienia platformy.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-2 text-apptax-teal">
                <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
                <span className="text-sm font-medium">Platforma zasilana AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
