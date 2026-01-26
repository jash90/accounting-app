import { Building2, Package, Users } from 'lucide-react';
import { useCompanies } from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';
import { useUsers } from '@/lib/hooks/use-users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const { data: users, isPending: usersLoading } = useUsers();
  const { data: companies, isPending: companiesLoading } = useCompanies();
  const { data: modules, isPending: modulesLoading } = useModules();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Panel Administratora</h1>
        <p className="text-muted-foreground mt-2">Przegląd statystyk systemowych i zarządzanie</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="users-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Wszyscy użytkownicy</CardTitle>
              <div className="bg-accent/10 rounded-lg p-2">
                <Users className="text-primary h-5 w-5" />
              </div>
            </div>
            <CardDescription>Wszyscy użytkownicy w systemie</CardDescription>
          </CardHeader>
          <CardContent>
            <p data-testid="user-count" className="text-primary text-4xl font-bold">
              {usersLoading ? '...' : users?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="companies-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Wszystkie firmy</CardTitle>
              <div className="bg-accent/10 rounded-lg p-2">
                <Building2 className="text-primary h-5 w-5" />
              </div>
            </div>
            <CardDescription>Zarejestrowane firmy</CardDescription>
          </CardHeader>
          <CardContent>
            <p data-testid="company-count" className="text-primary text-4xl font-bold">
              {companiesLoading ? '...' : companies?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="modules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Moduły</CardTitle>
              <div className="bg-accent/10 rounded-lg p-2">
                <Package className="text-accent h-5 w-5" />
              </div>
            </div>
            <CardDescription>Dostępne moduły</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p data-testid="module-count" className="text-primary text-4xl font-bold">
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
              <h2 className="mb-2 text-2xl font-bold">Witaj w AppTax Admin</h2>
              <p className="max-w-xl text-white/80">
                Zarządzaj firmami, użytkownikami i modułami z tego centralnego panelu. Monitoruj
                stan systemu i konfiguruj ustawienia platformy.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-accent flex items-center gap-2">
                <div className="bg-accent ai-glow h-3 w-3 rounded-full" />
                <span className="text-sm font-medium">Platforma zasilana AI</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
