export enum ZusStatus {
  FULL = 'FULL',
  PREFERENTIAL = 'PREFERENTIAL',
  NONE = 'NONE',
}

export const ZusStatusLabels: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny ZUS',
  [ZusStatus.PREFERENTIAL]: 'ZUS preferencyjny',
  [ZusStatus.NONE]: 'Brak ZUS',
};
