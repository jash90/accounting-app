import { useNavigate } from 'react-router-dom';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CompanyModulesListPage() {
  const navigate = useNavigate();
  const { data: modules = [], isPending } = useCompanyModules();

  return (
    <div>
      <PageHeader
        title="Available Modules"
        description="Modules enabled for your company"
      />

      <div className="mt-6">
        {isPending ? (
          <div>Loading...</div>
        ) : modules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No modules are currently enabled for your company. Contact an administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Card
                key={module.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary"
                onClick={() => navigate(`/modules/${module.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/modules/${module.slug}`);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <Badge variant={module.isActive ? 'default' : 'secondary'}>
                      {module.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Slug: <code className="text-xs bg-muted px-1 py-0.5 rounded">{module.slug}</code>
                  </p>
                  <p className="text-xs text-primary mt-2">Click to open module →</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

