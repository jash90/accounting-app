import { cn } from '@/lib/utils/cn';
import { TaskLabel } from '@/types/entities';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TaskLabelBadgeProps {
  label: TaskLabel;
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function TaskLabelBadge({ label, size = 'md', onRemove, className }: TaskLabelBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
      style={{
        backgroundColor: `${label.color}20`,
        color: label.color,
        borderColor: label.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          <X size={12} />
        </button>
      )}
    </Badge>
  );
}

interface TaskLabelListProps {
  labels: TaskLabel[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  onRemove?: (labelId: string) => void;
  className?: string;
}

export function TaskLabelList({
  labels,
  size = 'md',
  maxVisible = 3,
  onRemove,
  className,
}: TaskLabelListProps) {
  const visibleLabels = labels.slice(0, maxVisible);
  const hiddenCount = labels.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleLabels.map((label) => (
        <TaskLabelBadge
          key={label.id}
          label={label}
          size={size}
          onRemove={onRemove ? () => onRemove(label.id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="secondary"
          className={cn(sizeClasses[size], 'bg-muted text-muted-foreground')}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}
