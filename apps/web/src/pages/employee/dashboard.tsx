import { Package, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees } from '@/lib/hooks/use-employees';
import { useCompanyModules } from '@/lib/hooks/use-permissions';

export default function EmployeeDashboard() {
  const { data: employees, isPending: employeesLoading } = useEmployees();
  const { data: modules, isPending: modulesLoading } = useCompanyModules();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-apptax-navy text-3xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground mt-2">
          Przegląd Twojego obszaru roboczego i szybki dostęp do modułów
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Modules Card */}
        <Card data-testid="available-modules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dostępne moduły</CardTitle>
              <div className="bg-apptax-soft-teal rounded-lg p-2">
                <Package className="text-apptax-teal h-5 w-5" />
              </div>
            </div>
            <CardDescription>Moduły, do których masz dostęp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-apptax-blue text-4xl font-bold">
                {modulesLoading ? '...' : modules?.length || 0}
              </p>
              <div className="bg-apptax-teal ai-glow h-2 w-2 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card data-testid="team-members-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Członkowie zespołu</CardTitle>
              <div className="bg-apptax-soft-teal rounded-lg p-2">
                <Users className="text-apptax-blue h-5 w-5" />
              </div>
            </div>
            <CardDescription>Łączna liczba pracowników w Twojej firmie</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-apptax-blue text-4xl font-bold">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card - Uses accessible gradient with overlay for WCAG AA contrast */}
      <Card className="bg-apptax-ai-gradient-accessible overflow-hidden border-0 text-white">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold">Witaj w AppTax</h2>
              <p className="max-w-xl text-white">
                Dostęp do przypisanych modułów znajdziesz w menu bocznym. Korzystaj z narzędzi AI,
                aby usprawnić zadania księgowe i poprawić produktywność.
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="ai-glow-lg h-3 w-3 rounded-full bg-white" />
              <span className="text-sm font-medium">Zasilane przez AI</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
