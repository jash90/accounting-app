import { useParams, useNavigate } from 'react-router-dom';
import { useEmployee } from '@/lib/hooks/use-employees';
import { useCompanyModules, useEmployeeModules, useGrantModuleAccess, useUpdateModulePermission, useRevokeModuleAccess } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModulePermission } from '@/types/enums';
import { useToast } from '@/components/ui/use-toast';

export default function EmployeePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: employee, isPending: employeeLoading } = useEmployee(id || '');
  const { data: availableModules = [], isPending: modulesLoading } = useCompanyModules();
  const { data: employeeModules = [], isPending: permissionsLoading } = useEmployeeModules(id || '');
  const grantAccess = useGrantModuleAccess();
  const updatePermission = useUpdateModulePermission();
  const revokeAccess = useRevokeModuleAccess();

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleGrantAccess = () => {
    if (!id || !selectedModule) return;

    // Validate that the selected module is in the list of available modules
    const isModuleAvailable = availableModules.some(m => m.slug === selectedModule);
    if (!isModuleAvailable) {
      toast({
        title: 'Error',
        description: 'You cannot grant access to a module your company does not have access to.',
        variant: 'destructive',
      });
      return;
    }

    // Check if module is already granted (double-check)
    const isAlreadyGranted = employeeModules.some(em => em.module?.slug === selectedModule);
    if (isAlreadyGranted) {
      toast({
        title: 'Error',
        description: 'This module has already been granted to the employee.',
        variant: 'destructive',
      });
      return;
    }

    grantAccess.mutate({
      employeeId: id,
      moduleSlug: selectedModule,
      permissions: { moduleSlug: selectedModule, permissions: selectedPermissions },
    }, {
      onSuccess: () => {
        setGrantDialogOpen(false);
        setSelectedModule(null);
        setSelectedPermissions([]);
      },
    });
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

  const getModulePermissions = (moduleSlug: string) => {
    const module = employeeModules.find((m) => m.module?.slug === moduleSlug);
    return module?.permissions || [];
  };

  const availableModulesForGrant = availableModules.filter(
    (module) => !employeeModules.some((em) => em.module?.slug === module.slug)
  );

  if (employeeLoading || permissionsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Permissions: ${employee?.firstName} ${employee?.lastName}`}
        description="Manage module access and permissions for this employee"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/company/employees')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {availableModulesForGrant.length > 0 && (
              <Button onClick={() => setGrantDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Grant Module Access
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        {employeeModules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No module access granted yet. Click "Grant Module Access" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          employeeModules.map((employeeModule) => {
            const module = employeeModule.module;
            if (!module) return null;

            const currentPermissions = employeeModule.permissions || [];

            return (
              <Card key={employeeModule.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <CardDescription className="text-xs">{module.description}</CardDescription>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRevokeAccess(module.slug)}
                      title="Revoke module access"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Permissions:</div>
                    <div className="flex flex-wrap gap-4">
                      {[ModulePermission.READ, ModulePermission.WRITE, ModulePermission.DELETE].map((permission) => {
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
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.charAt(0).toUpperCase() + permission.slice(1)}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {currentPermissions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No permissions granted</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Module Access</DialogTitle>
            <DialogDescription>
              Select a module and permissions to grant to this employee.
              Only modules your company has access to are shown below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Module</label>
              {availableModulesForGrant.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All available modules have already been granted to this employee.
                </p>
              ) : (
                <select
                  className="w-full mt-2 rounded-md border-2 border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedModule || ''}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setSelectedPermissions([]);
                  }}
                >
                  <option value="">Select a module</option>
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
                <label className="text-sm font-medium mb-2 block">Permissions</label>
                <div className="mt-2 space-y-3">
                  {[ModulePermission.READ, ModulePermission.WRITE, ModulePermission.DELETE].map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grant-${permission}`}
                        checked={selectedPermissions.includes(permission)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permission]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter((p) => p !== permission));
                          }
                        }}
                      />
                      <label htmlFor={`grant-${permission}`} className="text-sm cursor-pointer">
                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setGrantDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGrantAccess}
                disabled={!selectedModule || selectedPermissions.length === 0 || grantAccess.isPending}
              >
                Grant Access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

