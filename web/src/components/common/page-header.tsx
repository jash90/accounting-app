import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, description, action, icon }: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="w-12 h-12 bg-apptax-gradient rounded-xl flex items-center justify-center text-white shadow-apptax-sm">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-apptax-navy">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
