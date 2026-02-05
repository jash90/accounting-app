export enum SettlementStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const SettlementStatusLabels: Record<SettlementStatus, string> = {
  [SettlementStatus.PENDING]: 'Oczekujące',
  [SettlementStatus.IN_PROGRESS]: 'W trakcie',
  [SettlementStatus.COMPLETED]: 'Zakończone',
};
