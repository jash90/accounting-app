export enum KsefInvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_SUBMISSION = 'PENDING_SUBMISSION',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
}

export const KsefInvoiceStatusLabels: Record<KsefInvoiceStatus, string> = {
  [KsefInvoiceStatus.DRAFT]: 'Szkic',
  [KsefInvoiceStatus.PENDING_SUBMISSION]: 'Oczekuje na wysłanie',
  [KsefInvoiceStatus.SUBMITTED]: 'Wysłana',
  [KsefInvoiceStatus.ACCEPTED]: 'Zaakceptowana',
  [KsefInvoiceStatus.REJECTED]: 'Odrzucona',
  [KsefInvoiceStatus.ERROR]: 'Błąd',
  [KsefInvoiceStatus.CANCELLED]: 'Anulowana',
};
