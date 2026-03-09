import { NavigationCard } from '@/components/ui/navigation-card';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { getModuleIcon } from '@/lib/utils/module-icons';
import { type ModuleDto } from '@/types/dtos';


interface ModuleNavigationCardProps {
  module: ModuleDto;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  clients: 'Zarządzaj klientami i kontaktami',
  tasks: 'Planuj i realizuj zadania',
  settlements: 'Rozliczenia miesięczne',
  'time-tracking': 'Ewidencja czasu pracy',
  offers: 'Oferty handlowe i leady',
  'ai-agent': 'Asystent AI do zadań',
  'email-client': 'Skrzynka e-mail',
  notifications: 'Centrum powiadomień',
};

const MODULE_GRADIENTS: Record<string, string> = {
  clients: 'bg-blue-500',
  tasks: 'bg-orange-500',
  settlements: 'bg-green-500',
  'time-tracking': 'bg-purple-500',
  offers: 'bg-amber-500',
  'ai-agent': 'bg-primary',
  'email-client': 'bg-cyan-500',
  notifications: 'bg-red-500',
};

function ModuleNavigationCard({ module }: ModuleNavigationCardProps) {
  const basePath = useModuleBasePath(module.slug);
  const Icon = getModuleIcon(module.icon);

  return (
    <NavigationCard
      title={module.name}
      description={MODULE_DESCRIPTIONS[module.slug] ?? module.description}
      icon={Icon}
      href={basePath}
      gradient={MODULE_GRADIENTS[module.slug] ?? 'bg-primary'}
      buttonVariant="outline"
    />
  );
}

interface DashboardModulesSectionProps {
  modules?: ModuleDto[];
}

export function DashboardModulesSection({ modules }: DashboardModulesSectionProps) {
  if (!modules?.length) return null;

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-semibold">Moduły</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => (
          <ModuleNavigationCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}
