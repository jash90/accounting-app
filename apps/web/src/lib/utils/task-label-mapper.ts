import { type TaskLabel, type TaskLabelAssignment } from '@/types/entities';

/**
 * Maps TaskLabelAssignment array to TaskLabel array, filtering out undefined labels.
 * This provides type-safe label extraction from assignment objects.
 */
export function mapTaskLabels(assignments: TaskLabelAssignment[] | undefined): TaskLabel[] {
  if (!assignments) return [];
  return assignments
    .map((assignment) => assignment.label)
    .filter((label): label is TaskLabel => Boolean(label));
}
