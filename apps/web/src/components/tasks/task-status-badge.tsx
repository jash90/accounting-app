import { createStatusBadge } from '@/components/common/status-badge';
import { TaskStatusColors, TaskStatusLabels, type TaskStatus } from '@/types/enums';

export const TaskStatusBadge = createStatusBadge<TaskStatus>({
  colors: TaskStatusColors,
  labels: TaskStatusLabels,
  variant: 'secondary',
  baseClassName: 'font-medium',
});
