import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/lib/hooks/use-users';
import { useCompanies } from '@/lib/hooks/use-companies';
import { useModules } from '@/lib/hooks/use-modules';

export default function AdminDashboard() {
  const { data: users, isPending: usersLoading } = useUsers();
  const { data: companies, isPending: companiesLoading } = useCompanies();
  const { data: modules, isPending: modulesLoading } = useModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Overview of system statistics and management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Total Users</CardTitle>
            <CardDescription className="text-xs">All users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {usersLoading ? '...' : users?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Total Companies</CardTitle>
            <CardDescription className="text-xs">Registered companies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {companiesLoading ? '...' : companies?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Modules</CardTitle>
            <CardDescription className="text-xs">Available modules</CardDescription>
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

