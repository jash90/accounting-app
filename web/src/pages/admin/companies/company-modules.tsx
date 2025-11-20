import { useParams, useNavigate } from 'react-router-dom';
import { useCompany, useCompanyModules, useGrantModuleToCompany, useRevokeModuleFromCompany } from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
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
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
          <Button onClick={() => navigate('/admin/companies')}>
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
      >
        <Button
          variant="outline"
          onClick={() => navigate('/admin/companies')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Companies
        </Button>
      </PageHeader>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {company.name}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Available Modules</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {allModules.map((module) => {
            const isEnabled = isModuleEnabled(module.id);
            const isUpdating = grantModule.isPending || revokeModule.isPending;

            return (
              <Card
                key={module.id}
                className="shadow-sm hover:shadow-md transition-shadow"
                data-testid={`module-card-${module.slug}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                    </div>
                    <Badge variant={isEnabled ? 'default' : 'secondary'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
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
          <Card>
            <CardContent className="py-10">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No modules available in the system</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
