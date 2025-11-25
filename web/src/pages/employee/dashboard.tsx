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
    <div className="space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-apptax-navy">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Your workspace overview and quick access to modules
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Modules Card */}
        <Card data-testid="available-modules-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Available Modules</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Package className="h-5 w-5 text-apptax-teal" />
              </div>
            </div>
            <CardDescription>Modules you have access to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-apptax-blue">
                {modulesLoading ? '...' : modules?.length || 0}
              </p>
              <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
            </div>
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card data-testid="team-members-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Team Members</CardTitle>
              <div className="p-2 bg-apptax-soft-teal rounded-lg">
                <Users className="h-5 w-5 text-apptax-blue" />
              </div>
            </div>
            <CardDescription>Total employees in your company</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-apptax-blue">
              {employeesLoading ? '...' : employees?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="bg-apptax-ai-gradient text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to AppTax</h2>
              <p className="text-white/90 max-w-xl">
                Access your assigned modules from the sidebar. Use AI-powered tools
                to streamline your accounting tasks and improve productivity.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white ai-glow-lg" />
              <span className="text-sm font-medium">AI-Powered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
