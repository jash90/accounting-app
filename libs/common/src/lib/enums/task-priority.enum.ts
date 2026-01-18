export enum TaskPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'Pilne',
  [TaskPriority.HIGH]: 'Wysoki',
  [TaskPriority.MEDIUM]: 'Średni',
  [TaskPriority.LOW]: 'Niski',
  [TaskPriority.NONE]: 'Brak',
};

export const TaskPriorityColors: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'red',
  [TaskPriority.HIGH]: 'orange',
  [TaskPriority.MEDIUM]: 'yellow',
  [TaskPriority.LOW]: 'blue',
  [TaskPriority.NONE]: 'gray',
};

export const TaskPriorityOrder: TaskPriority[] = [
  TaskPriority.URGENT,
  TaskPriority.HIGH,
  TaskPriority.MEDIUM,
  TaskPriority.LOW,
  TaskPriority.NONE,
];
