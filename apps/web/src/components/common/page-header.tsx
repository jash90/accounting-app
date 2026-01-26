import { type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  titleAction?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  icon,
  titleAction,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-4 sm:mb-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {icon && (
            <div className="bg-apptax-gradient shadow-apptax-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white sm:h-12 sm:w-12">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-apptax-navy truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{description}</p>
            )}
          </div>
          {titleAction && <div className="shrink-0">{titleAction}</div>}
        </div>
        {action && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row [&>button]:w-full [&>button]:sm:w-auto">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
