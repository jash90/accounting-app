export enum SettlementStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  MISSING_INVOICE_VERIFICATION = 'MISSING_INVOICE_VERIFICATION',
  MISSING_INVOICE = 'MISSING_INVOICE',
  COMPLETED = 'COMPLETED',
}

export const SettlementStatusLabels: Record<SettlementStatus, string> = {
  [SettlementStatus.PENDING]: 'Oczekujące',
  [SettlementStatus.IN_PROGRESS]: 'W trakcie',
  [SettlementStatus.MISSING_INVOICE_VERIFICATION]: 'Brakująca weryfikacja faktury',
  [SettlementStatus.MISSING_INVOICE]: 'Brakująca faktura',
  [SettlementStatus.COMPLETED]: 'Zakończone',
};
