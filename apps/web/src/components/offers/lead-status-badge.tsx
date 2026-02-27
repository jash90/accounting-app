import { createStatusBadge } from '@/components/common/status-badge';
import { LeadStatusColors, LeadStatusLabels, type LeadStatus } from '@/types/enums';

export const LeadStatusBadge = createStatusBadge<LeadStatus>({
  colors: LeadStatusColors,
  labels: LeadStatusLabels,
  variant: 'outline',
  baseClassName: 'border-0',
});
