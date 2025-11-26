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
        icon={<Package className="h-6 w-6" />}
      />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-apptax-soft-teal/30">
              <CardHeader>
                <div className="h-5 bg-apptax-soft-teal/30 rounded w-1/2" />
                <div className="h-4 bg-apptax-soft-teal/20 rounded w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-apptax-soft-teal/20 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card className="border-dashed border-apptax-soft-teal">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-apptax-soft-teal flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-apptax-teal" />
            </div>
            <p className="text-apptax-navy font-medium">
              No modules are currently enabled for your company.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact an administrator to enable modules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const isAiModule = module.slug === 'ai-agent';
            return (
              <Card
                key={module.id}
                className="group cursor-pointer hover:border-apptax-blue hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1 border-apptax-soft-teal/30"
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
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAiModule ? 'bg-apptax-ai-gradient ai-glow' : 'bg-apptax-gradient'
                      }`}>
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2 text-apptax-navy">
                        {module.name}
                        {isAiModule && (
                          <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />
                        )}
                      </CardTitle>
                    </div>
                    <Badge variant={module.isActive ? 'success' : 'muted'}>
                      {module.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <code className="px-2 py-1 bg-apptax-soft-teal rounded text-xs text-apptax-navy">
                      {module.slug}
                    </code>
                    <span className="text-apptax-blue text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open module
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
