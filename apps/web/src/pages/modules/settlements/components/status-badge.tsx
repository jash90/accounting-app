import { Badge } from '@/components/ui/badge';
import { SettlementStatus, SettlementStatusLabels } from '@/lib/api/endpoints/settlements';
import { cn } from '@/lib/utils/cn';

interface StatusBadgeProps {
  status: SettlementStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariantClasses = () => {
    switch (status) {
      case SettlementStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
      case SettlementStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
      case SettlementStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      default:
        return '';
    }
  };

  return (
    <Badge variant="outline" className={cn(getVariantClasses(), className)}>
      {SettlementStatusLabels[status]}
    </Badge>
  );
}
