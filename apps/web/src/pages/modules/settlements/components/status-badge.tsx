import { createStatusBadge } from '@/components/common/status-badge';
import { type SettlementStatus, SettlementStatusColors, SettlementStatusLabels } from '@/types/enums';

export const StatusBadge = createStatusBadge<SettlementStatus>({
  colors: SettlementStatusColors,
  labels: SettlementStatusLabels,
  variant: 'outline',
});
