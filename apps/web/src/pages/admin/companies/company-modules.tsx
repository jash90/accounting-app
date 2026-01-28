import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Package, Building2 } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useCompany,
  useCompanyModules,
  useGrantModuleToCompany,
  useRevokeModuleFromCompany,
} from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';

export default function CompanyModulesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isPending: companyLoading } = useCompany(id || '');
  const { data: allModules = [], isPending: modulesLoading } = useModules();
  const { data: companyModuleAccesses = [], isPending: accessesLoading } = useCompanyModules(
    id || ''
  );

  const grantModule = useGrantModuleToCompany();
  const revokeModule = useRevokeModuleFromCompany();

  const isModuleEnabled = (moduleId: string): boolean => {
    const access = companyModuleAccesses.find((a) => a.moduleId === moduleId);
    return access?.isEnabled || false;
  };

  const handleToggleModule = async (moduleSlug: string, currentlyEnabled: boolean) => {
    if (!id) return;

    if (currentlyEnabled) {
      // Disable module
      revokeModule.mutate({ companyId: id, moduleSlug });
    } else {
      // Enable module
      grantModule.mutate({ companyId: id, moduleSlug });
    }
  };

  if (companyLoading || modulesLoading || accessesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="bg-apptax-soft-teal/30 h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="bg-apptax-soft-teal/30 h-40" />
          <Skeleton className="bg-apptax-soft-teal/30 h-40" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="bg-apptax-soft-teal mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Building2 className="text-apptax-teal h-8 w-8" />
          </div>
          <h1 className="text-apptax-navy mb-4 text-2xl font-bold">Nie znaleziono firmy</h1>
          <Button
            onClick={() => navigate('/admin/companies')}
            className="bg-apptax-blue hover:bg-apptax-blue/90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do firm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Moduły - ${company.name}`}
        description="Zarządzaj modułami dostępnymi dla tej firmy"
        icon={<Package className="h-6 w-6" />}
        action={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/companies')}
            className="border-apptax-soft-teal hover:bg-apptax-soft-teal/50 hover:border-apptax-teal"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do firm
          </Button>
        }
      />

      {/* Company Info */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Building2 className="text-apptax-teal h-5 w-5" />
            Informacje o firmie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-apptax-navy font-medium">Nazwa:</span>{' '}
              <span className="text-apptax-navy/70">{company.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-apptax-navy mb-4 text-2xl font-bold tracking-tight">Dostępne moduły</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {allModules.map((module) => {
            const isEnabled = isModuleEnabled(module.id);
            const isUpdating = grantModule.isPending || revokeModule.isPending;
            const isAiModule = module.slug === 'ai-agent';

            return (
              <Card
                key={module.id}
                className={`hover:shadow-apptax-md border-apptax-soft-teal/30 shadow-sm transition-all duration-300 hover:-translate-y-1 ${
                  isEnabled ? 'border-apptax-teal/50' : ''
                }`}
                data-testid={`module-card-${module.slug}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isAiModule ? 'bg-apptax-ai-gradient ai-glow' : 'bg-apptax-gradient'
                        }`}
                      >
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-apptax-navy flex items-center gap-2 text-lg">
                          {module.name}
                          {isAiModule && (
                            <div className="bg-apptax-teal ai-glow h-2 w-2 rounded-full" />
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge variant={isEnabled ? 'success' : 'muted'}>
                      {isEnabled ? 'Włączony' : 'Wyłączony'}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 text-xs">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      {isEnabled
                        ? 'Ten moduł jest dostępny dla firmy'
                        : 'Włącz ten moduł dla firmy'}
                    </span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleModule(module.slug, isEnabled)}
                      disabled={!module.isActive || isUpdating}
                      data-testid={`module-toggle-${module.slug}`}
                    />
                  </div>
                  {!module.isActive && (
                    <p className="text-destructive mt-2 text-xs">
                      Ten moduł jest nieaktywny w systemie
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {allModules.length === 0 && (
          <Card className="border-apptax-soft-teal/30">
            <CardContent className="py-10">
              <div className="text-muted-foreground text-center">
                <div className="bg-apptax-soft-teal mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <Package className="text-apptax-teal h-8 w-8" />
                </div>
                <p>Brak dostępnych modułów w systemie</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
