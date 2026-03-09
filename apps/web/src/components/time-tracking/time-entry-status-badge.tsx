import { createStatusBadge } from '@/components/common/status-badge';
import { TimeEntryStatusColors, TimeEntryStatusLabels, type TimeEntryStatus } from '@/types/enums';

export const TimeEntryStatusBadge = createStatusBadge<TimeEntryStatus>({
  colors: TimeEntryStatusColors,
  labels: TimeEntryStatusLabels,
  variant: 'secondary',
});
