import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { getModuleIcon } from '@/lib/utils/module-icons';
import { ModuleCard } from '@/components/ui/module-card';

export default function CompanyModulesListPage() {
  const { data: modules = [], isPending } = useCompanyModules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dostępne moduły"
        description="Moduły włączone dla Twojej firmy"
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
              Brak włączonych modułów dla Twojej firmy.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Skontaktuj się z administratorem, aby włączyć moduły.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              description={module.description}
              slug={module.slug}
              icon={getModuleIcon(module.icon)}
              isActive={module.isActive}
              isAiModule={module.slug === 'ai-agent'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
