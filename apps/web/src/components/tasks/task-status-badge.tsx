import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { type TaskStatus, TaskStatusLabels, TaskStatusColors } from '@/types/enums';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function TaskStatusBadge({ status, size = 'md', className }: TaskStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(TaskStatusColors[status], sizeClasses[size], 'font-medium', className)}
    >
      {TaskStatusLabels[status]}
    </Badge>
  );
}
