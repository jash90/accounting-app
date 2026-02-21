import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { type OfferStatus, OfferStatusColors, OfferStatusLabels } from '@/types/enums';

interface OfferStatusBadgeProps {
  status: OfferStatus;
  className?: string;
}

export function OfferStatusBadge({ status, className }: OfferStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(OfferStatusColors[status], 'border-0', className)}>
      {OfferStatusLabels[status]}
    </Badge>
  );
}
