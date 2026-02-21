import { useNavigate } from 'react-router-dom';

import { ArrowRight, type LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        'group hover:border-primary hover:shadow-md border-border flex flex-1 cursor-pointer flex-col transition-all duration-300 hover:-translate-y-1',
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
      <CardHeader className="flex-1 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isAiModule ? 'bg-accent ai-glow' : 'bg-primary'
              )}
            >
              <ModuleIcon className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-foreground flex items-center gap-2 text-lg">
              {name}
              {isAiModule && <div className="bg-accent ai-glow h-2 w-2 rounded-full" />}
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
          <code className="bg-accent/10 text-foreground rounded px-2 py-1 text-xs">{slug}</code>
          <span className="text-primary flex items-center gap-1 text-sm opacity-0 transition-opacity group-hover:opacity-100">
            Otwórz moduł
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
