import { useParams, useNavigate } from 'react-router-dom';
import { useCompany, useCompanyModules, useGrantModuleToCompany, useRevokeModuleFromCompany } from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompanyModulesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isPending: companyLoading } = useCompany(id || '');
  const { data: allModules = [], isPending: modulesLoading } = useModules();
  const { data: companyModuleAccesses = [], isPending: accessesLoading } = useCompanyModules(id || '');

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
        <Skeleton className="h-20 w-full bg-apptax-soft-teal/30" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 bg-apptax-soft-teal/30" />
          <Skeleton className="h-40 bg-apptax-soft-teal/30" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-apptax-soft-teal flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-apptax-teal" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-apptax-navy">Company Not Found</h1>
          <Button
            onClick={() => navigate('/admin/companies')}
            className="bg-apptax-blue hover:bg-apptax-blue/90"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Modules - ${company.name}`}
        description="Manage which modules are available for this company"
        icon={<Package className="h-6 w-6" />}
        action={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/companies')}
            className="border-apptax-soft-teal hover:bg-apptax-soft-teal/50 hover:border-apptax-teal"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        }
      />

      {/* Company Info */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <Building2 className="h-5 w-5 text-apptax-teal" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-medium text-apptax-navy">Name:</span>{' '}
              <span className="text-apptax-navy/70">{company.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-apptax-navy">Available Modules</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {allModules.map((module) => {
            const isEnabled = isModuleEnabled(module.id);
            const isUpdating = grantModule.isPending || revokeModule.isPending;
            const isAiModule = module.slug === 'ai-agent';

            return (
              <Card
                key={module.id}
                className={`shadow-sm hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1 border-apptax-soft-teal/30 ${
                  isEnabled ? 'border-apptax-teal/50' : ''
                }`}
                data-testid={`module-card-${module.slug}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAiModule ? 'bg-apptax-ai-gradient ai-glow' : 'bg-apptax-gradient'
                      }`}>
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-apptax-navy flex items-center gap-2">
                          {module.name}
                          {isAiModule && (
                            <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge variant={isEnabled ? 'success' : 'muted'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isEnabled ? 'This module is available for the company' : 'Enable this module for the company'}
                    </span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleModule(module.slug, isEnabled)}
                      disabled={!module.isActive || isUpdating}
                      data-testid={`module-toggle-${module.slug}`}
                    />
                  </div>
                  {!module.isActive && (
                    <p className="text-xs text-destructive mt-2">
                      This module is inactive in the system
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
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-apptax-soft-teal flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-apptax-teal" />
                </div>
                <p>No modules available in the system</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
