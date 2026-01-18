export enum TaskDependencyType {
  BLOCKS = 'blocks',
  BLOCKED_BY = 'blocked_by',
  RELATES_TO = 'relates_to',
}

export const TaskDependencyTypeLabels: Record<TaskDependencyType, string> = {
  [TaskDependencyType.BLOCKS]: 'Blokuje',
  [TaskDependencyType.BLOCKED_BY]: 'Zablokowane przez',
  [TaskDependencyType.RELATES_TO]: 'Powiązane z',
};
