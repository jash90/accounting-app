import { useNavigate } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: LucideIcon;
  isActive?: boolean;
  isAiModule?: boolean;
  href?: string;
  className?: string;
}

export function ModuleCard({
  name,
  description,
  slug,
  icon: ModuleIcon,
  isActive = true,
  isAiModule = false,
  href,
  className,
}: ModuleCardProps) {
  const navigate = useNavigate();
  const targetHref = href ?? `/modules/${slug}`;

  return (
    <Card
      className={cn(
        'group cursor-pointer hover:border-apptax-blue hover:shadow-apptax-md transition-all duration-300 hover:-translate-y-1 border-apptax-soft-teal/30 flex flex-1 flex-col',
        className
      )}
      onClick={() => navigate(targetHref)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(targetHref);
        }
      }}
    >
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isAiModule ? 'bg-apptax-ai-gradient ai-glow' : 'bg-apptax-gradient'
              )}
            >
              <ModuleIcon className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-lg flex items-center gap-2 text-apptax-navy">
              {name}
              {isAiModule && <div className="w-2 h-2 rounded-full bg-apptax-teal ai-glow" />}
            </CardTitle>
          </div>
          <Badge variant={isActive ? 'success' : 'muted'}>
            {isActive ? 'Aktywny' : 'Nieaktywny'}
          </Badge>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <code className="px-2 py-1 bg-apptax-soft-teal rounded text-xs text-apptax-navy">
            {slug}
          </code>
          <span className="text-apptax-blue text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Otwórz moduł
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
