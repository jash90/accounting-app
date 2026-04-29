export enum KsefSessionType {
  INTERACTIVE = 'INTERACTIVE',
  BATCH = 'BATCH',
}

export const KsefSessionTypeLabels: Record<KsefSessionType, string> = {
  [KsefSessionType.INTERACTIVE]: 'Interaktywna',
  [KsefSessionType.BATCH]: 'Wsadowa',
};
