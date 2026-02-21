import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { TaskPriority, TaskPriorityColors, TaskPriorityLabels } from '@/types/enums';


interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

const iconSizeMap = {
  sm: 12,
  md: 14,
  lg: 16,
};

const priorityIcons: Record<
  TaskPriority,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  [TaskPriority.URGENT]: AlertTriangle,
  [TaskPriority.HIGH]: ArrowUp,
  [TaskPriority.MEDIUM]: ArrowRight,
  [TaskPriority.LOW]: ArrowDown,
  [TaskPriority.NONE]: Minus,
};

export function TaskPriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}: TaskPriorityBadgeProps) {
  const Icon = priorityIcons[priority];

  return (
    <Badge
      variant="secondary"
      className={cn(
        TaskPriorityColors[priority],
        sizeClasses[size],
        'inline-flex items-center gap-1 font-medium',
        className
      )}
    >
      {showIcon && <Icon size={iconSizeMap[size]} />}
      {showLabel && TaskPriorityLabels[priority]}
    </Badge>
  );
}
