import { Badge } from '@/components/ui/badge';
import { TimeEntryStatus, TimeEntryStatusLabels, TimeEntryStatusColors } from '@/types/enums';
import { cn } from '@/lib/utils/cn';

interface TimeEntryStatusBadgeProps {
  status: TimeEntryStatus;
  className?: string;
}

export function TimeEntryStatusBadge({ status, className }: TimeEntryStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(TimeEntryStatusColors[status], className)}
    >
      {TimeEntryStatusLabels[status]}
    </Badge>
  );
}
