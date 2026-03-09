export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.TODO]: 'Do zrobienia',
  [TaskStatus.IN_PROGRESS]: 'W trakcie',
  [TaskStatus.IN_REVIEW]: 'Do przeglądu',
  [TaskStatus.DONE]: 'Gotowe',
  [TaskStatus.CANCELLED]: 'Anulowane',
  [TaskStatus.BLOCKED]: 'Zablokowane',
};

export const TaskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'gray',
  [TaskStatus.TODO]: 'blue',
  [TaskStatus.IN_PROGRESS]: 'yellow',
  [TaskStatus.IN_REVIEW]: 'purple',
  [TaskStatus.DONE]: 'green',
  [TaskStatus.CANCELLED]: 'red',
  [TaskStatus.BLOCKED]: 'orange',
};

export const TaskStatusOrder: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
  TaskStatus.BLOCKED,
];
