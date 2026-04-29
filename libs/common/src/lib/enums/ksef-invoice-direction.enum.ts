export enum KsefInvoiceDirection {
  OUTGOING = 'OUTGOING',
  INCOMING = 'INCOMING',
}

export const KsefInvoiceDirectionLabels: Record<KsefInvoiceDirection, string> = {
  [KsefInvoiceDirection.OUTGOING]: 'Wychodząca',
  [KsefInvoiceDirection.INCOMING]: 'Przychodząca',
};
