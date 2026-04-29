export enum KsefSessionStatus {
  OPENING = 'OPENING',
  ACTIVE = 'ACTIVE',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  ERROR = 'ERROR',
}

export const KsefSessionStatusLabels: Record<KsefSessionStatus, string> = {
  [KsefSessionStatus.OPENING]: 'Otwieranie',
  [KsefSessionStatus.ACTIVE]: 'Aktywna',
  [KsefSessionStatus.CLOSING]: 'Zamykanie',
  [KsefSessionStatus.CLOSED]: 'Zamknięta',
  [KsefSessionStatus.ERROR]: 'Błąd',
};
