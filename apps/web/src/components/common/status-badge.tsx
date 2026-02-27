import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';


const sizeClasses = {
  sm: 'text-xs px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function createStatusBadge<T extends string>(config: {
  colors: Record<T, string>;
  labels: Record<T, string>;
  variant?: BadgeProps['variant'];
  baseClassName?: string;
}) {
  const { colors, labels, variant = 'secondary', baseClassName } = config;
  return function StatusBadge({
    status,
    size = 'md',
    className,
  }: {
    status: T;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }) {
    return (
      <Badge
        variant={variant}
        className={cn(colors[status], sizeClasses[size], baseClassName, className)}
      >
        {labels[status]}
      </Badge>
    );
  };
}
