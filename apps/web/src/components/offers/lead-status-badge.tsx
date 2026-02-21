import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { type LeadStatus, LeadStatusColors, LeadStatusLabels } from '@/types/enums';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(LeadStatusColors[status], 'border-0', className)}>
      {LeadStatusLabels[status]}
    </Badge>
  );
}
