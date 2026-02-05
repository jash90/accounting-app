import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { TimeEntryStatusColors, TimeEntryStatusLabels, type TimeEntryStatus } from '@/types/enums';


interface TimeEntryStatusBadgeProps {
  status: TimeEntryStatus;
  className?: string;
}

export function TimeEntryStatusBadge({ status, className }: TimeEntryStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(TimeEntryStatusColors[status], className)}>
      {TimeEntryStatusLabels[status]}
    </Badge>
  );
}
