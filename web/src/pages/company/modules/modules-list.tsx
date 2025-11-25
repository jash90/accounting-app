import { useNavigate } from 'react-router-dom';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight } from 'lucide-react';

export default function CompanyModulesListPage() {
  const navigate = useNavigate();
  const { data: modules = [], isPending } = useCompanyModules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Available Modules"
        description="Modules enabled for your company"
      />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No modules are currently enabled for your company.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact an administrator to enable modules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card
              key={module.id}
              className="group cursor-pointer hover:border-apptax-blue transition-all duration-200"
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
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {module.name}
                    {module.slug === 'ai-agent' && (
                      <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
                    )}
                  </CardTitle>
                  <Badge variant={module.isActive ? 'success' : 'muted'}>
                    {module.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    {module.slug}
                  </code>
                  <span className="text-apptax-blue text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open module
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
