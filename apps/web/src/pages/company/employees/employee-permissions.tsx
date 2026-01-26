import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { ModulePermission } from '@/types/enums';
import { ArrowLeft, Key, Package, Plus, Shield, Trash2 } from 'lucide-react';
import { useEmployee } from '@/lib/hooks/use-employees';
import {
  useCompanyModules,
  useEmployeeModules,
  useGrantModuleAccess,
  useRevokeModuleAccess,
  useUpdateModulePermission,
} from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function EmployeePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: employee, isPending: employeeLoading } = useEmployee(id || '');
  const { data: availableModules = [], isPending: _modulesLoading } = useCompanyModules();
  const { data: employeeModules = [], isPending: permissionsLoading } = useEmployeeModules(
    id || ''
  );
  const grantAccess = useGrantModuleAccess();
  const updatePermission = useUpdateModulePermission();
  const revokeAccess = useRevokeModuleAccess();

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleGrantAccess = () => {
    if (!id || !selectedModule) return;

    const isModuleAvailable = availableModules.some((m) => m.slug === selectedModule);
    if (!isModuleAvailable) {
      toast({
        title: 'Błąd',
        description: 'Nie możesz nadać dostępu do modułu, do którego Twoja firma nie ma dostępu.',
        variant: 'destructive',
      });
      return;
    }

    const isAlreadyGranted = employeeModules.some((em) => em.module?.slug === selectedModule);
    if (isAlreadyGranted) {
      toast({
        title: 'Błąd',
        description: 'Ten moduł został już przyznany pracownikowi.',
        variant: 'destructive',
      });
      return;
    }

    grantAccess.mutate(
      {
        employeeId: id,
        moduleSlug: selectedModule,
        permissions: { moduleSlug: selectedModule, permissions: selectedPermissions },
      },
      {
        onSuccess: () => {
          setGrantDialogOpen(false);
          setSelectedModule(null);
          setSelectedPermissions([]);
        },
      }
    );
  };

  const handleUpdatePermissions = (moduleSlug: string, permissions: string[]) => {
    if (!id) return;

    updatePermission.mutate({
      employeeId: id,
      moduleSlug,
      permissions: { permissions },
    });
  };

  const handleRevokeAccess = (moduleSlug: string) => {
    if (!id) return;

    revokeAccess.mutate({
      employeeId: id,
      moduleSlug,
    });
  };

  const availableModulesForGrant = availableModules.filter(
    (module) => !employeeModules.some((em) => em.module?.slug === module.slug)
  );

  if (employeeLoading || permissionsLoading || _modulesLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-accent/10 h-8 w-1/3 animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border animate-pulse">
              <CardHeader>
                <div className="bg-accent/10 h-5 w-1/2 rounded" />
              </CardHeader>
              <CardContent>
                <div className="bg-accent/5 h-4 w-3/4 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Uprawnienia: ${employee?.firstName} ${employee?.lastName}`}
        description="Zarządzaj dostępem do modułów i uprawnieniami tego pracownika"
        icon={<Key className="h-6 w-6" />}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/company/employees')}
              className="border-accent hover:bg-accent/20 hover:border-accent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć
            </Button>
            {availableModulesForGrant.length > 0 && (
              <Button
                onClick={() => setGrantDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nadaj dostęp do modułu
              </Button>
            )}
          </div>
        }
      />

      {employeeModules.length === 0 ? (
        <Card className="border-accent border-dashed">
          <CardContent className="py-12 text-center">
            <div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Shield className="text-accent h-8 w-8" />
            </div>
            <p className="text-foreground font-medium">Brak przyznanych dostępów do modułów.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Kliknij &quot;Nadaj dostęp do modułu&quot;, aby rozpocząć.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {employeeModules.map((employeeModule) => {
            const module = employeeModule.module;
            if (!module) return null;

            const currentPermissions = employeeModule.permissions || [];
            const isAiModule = module.slug === 'ai-agent';

            return (
              <Card
                key={employeeModule.id}
                className="border-border hover:shadow-md transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isAiModule ? 'bg-accent ai-glow' : 'bg-primary'
                        }`}
                      >
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                          {module.name}
                          {isAiModule && <div className="bg-accent ai-glow h-2 w-2 rounded-full" />}
                        </CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-destructive/10 h-9 w-9"
                      onClick={() => handleRevokeAccess(module.slug)}
                      title="Cofnij dostęp do modułu"
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-foreground text-sm font-semibold">Uprawnienia:</div>
                    <div className="flex flex-wrap gap-6">
                      {[ModulePermission.READ, ModulePermission.WRITE, ModulePermission.DELETE].map(
                        (permission) => {
                          const hasPermission = currentPermissions.includes(permission);
                          return (
                            <div key={permission} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${module.slug}-${permission}`}
                                checked={hasPermission}
                                onCheckedChange={(checked) => {
                                  const newPermissions = checked
                                    ? [...currentPermissions, permission]
                                    : currentPermissions.filter((p) => p !== permission);
                                  handleUpdatePermissions(module.slug, newPermissions);
                                }}
                              />
                              <label
                                htmlFor={`${module.slug}-${permission}`}
                                className="text-foreground/80 cursor-pointer text-sm font-medium"
                              >
                                {permission.charAt(0).toUpperCase() + permission.slice(1)}
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>
                    {currentPermissions.length === 0 && (
                      <p className="text-muted-foreground text-sm">Brak przyznanych uprawnień</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nadaj dostęp do modułu</DialogTitle>
            <DialogDescription>
              Wybierz moduł i uprawnienia do przyznania temu pracownikowi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label
                htmlFor="grant-module-select"
                className="text-foreground mb-2 block text-sm font-medium"
              >
                Moduł
              </label>
              {availableModulesForGrant.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Wszystkie dostępne moduły zostały już przyznane temu pracownikowi.
                </p>
              ) : (
                <select
                  id="grant-module-select"
                  className="focus:ring-primary/20 focus:border-primary w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:ring-2 focus:outline-none"
                  value={selectedModule || ''}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setSelectedPermissions([]);
                  }}
                >
                  <option value="">Wybierz moduł</option>
                  {availableModulesForGrant.map((module) => (
                    <option key={module.id} value={module.slug}>
                      {module.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedModule && (
              <div>
                <span className="text-foreground mb-2 block text-sm font-medium">Uprawnienia</span>
                <div className="mt-2 space-y-3">
                  {[ModulePermission.READ, ModulePermission.WRITE, ModulePermission.DELETE].map(
                    (permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`grant-${permission}`}
                          checked={selectedPermissions.includes(permission)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, permission]);
                            } else {
                              setSelectedPermissions(
                                selectedPermissions.filter((p) => p !== permission)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`grant-${permission}`}
                          className="cursor-pointer text-sm text-gray-700"
                        >
                          {permission.charAt(0).toUpperCase() + permission.slice(1)}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantDialogOpen(false)}
              className="border-accent hover:bg-accent/20"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={
                !selectedModule || selectedPermissions.length === 0 || grantAccess.isPending
              }
              className="bg-primary hover:bg-primary/90"
            >
              Nadaj dostęp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
