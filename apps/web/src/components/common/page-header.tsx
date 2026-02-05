import { memo, type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  titleAction?: ReactNode;
}

export const PageHeader = memo(function PageHeader({
  title,
  description,
  action,
  icon,
  titleAction,
}: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="bg-primary shadow-sm flex h-12 w-12 items-center justify-center rounded-xl text-white">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-foreground text-3xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          </div>
          {titleAction && <div className="flex-shrink-0">{titleAction}</div>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
});
