export enum KsefInvoiceType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  CORRECTION = 'CORRECTION',
}

export const KsefInvoiceTypeLabels: Record<KsefInvoiceType, string> = {
  [KsefInvoiceType.SALES]: 'Sprzedaż',
  [KsefInvoiceType.PURCHASE]: 'Zakup',
  [KsefInvoiceType.CORRECTION]: 'Korekta',
};
