import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployees } from '@/lib/hooks/use-employees';
import { useCompanyModules } from '@/lib/hooks/use-permissions';

export default function CompanyDashboard() {
  const { data: employees, isPending: employeesLoading } = useEmployees();
  const { data: modules, isPending: modulesLoading } = useCompanyModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Overview of your company and employees
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Employees</CardTitle>
            <CardDescription className="text-xs">Total employees in your company</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Available Modules</CardTitle>
            <CardDescription className="text-xs">Modules enabled for your company</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {modulesLoading ? '...' : modules?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

