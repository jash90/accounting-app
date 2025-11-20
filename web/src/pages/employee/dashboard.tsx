import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useEmployees } from '@/lib/hooks/use-employees';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { Package, Users } from 'lucide-react';

export default function EmployeeDashboard() {
  const { data: employees, isPending: employeesLoading } = useEmployees();
  const { data: modules, isPending: modulesLoading } = useCompanyModules();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your workspace overview and quick access to modules
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Available Modules Card */}
        <Card
          className="shadow-sm hover:shadow-md transition-shadow"
          data-testid="available-modules-card"
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Available Modules
            </CardTitle>
            <CardDescription className="text-xs">
              Modules you have access to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {modulesLoading ? '...' : modules?.length || 0}
            </p>
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card
          className="shadow-sm hover:shadow-md transition-shadow"
          data-testid="team-members-card"
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription className="text-xs">
              Total employees in your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
