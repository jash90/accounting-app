import { createStatusBadge } from '@/components/common/status-badge';
import { OfferStatusColors, OfferStatusLabels, type OfferStatus } from '@/types/enums';

export const OfferStatusBadge = createStatusBadge<OfferStatus>({
  colors: OfferStatusColors,
  labels: OfferStatusLabels,
  variant: 'outline',
  baseClassName: 'border-0',
});
