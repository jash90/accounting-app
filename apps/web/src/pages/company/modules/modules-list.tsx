import { Package } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ModuleCard } from '@/components/ui/module-card';
import { useCompanyModules } from '@/lib/hooks/use-permissions';
import { getModuleIcon } from '@/lib/utils/module-icons';

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
            <Card key={i} className="border-apptax-soft-teal/30 animate-pulse">
              <CardHeader>
                <div className="bg-apptax-soft-teal/30 h-5 w-1/2 rounded" />
                <div className="bg-apptax-soft-teal/20 mt-2 h-4 w-3/4 rounded" />
              </CardHeader>
              <CardContent>
                <div className="bg-apptax-soft-teal/20 h-4 w-1/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card className="border-apptax-soft-teal border-dashed">
          <CardContent className="py-12 text-center">
            <div className="bg-apptax-soft-teal mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Package className="text-apptax-teal h-8 w-8" />
            </div>
            <p className="text-apptax-navy font-medium">
              Brak włączonych modułów dla Twojej firmy.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
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
