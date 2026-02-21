export enum OfferStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const VALID_OFFER_STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.DRAFT]: [OfferStatus.READY, OfferStatus.CANCELLED],
  [OfferStatus.READY]: [OfferStatus.DRAFT, OfferStatus.SENT, OfferStatus.CANCELLED],
  [OfferStatus.SENT]: [
    OfferStatus.VIEWED,
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.EXPIRED,
    OfferStatus.CANCELLED,
  ],
  [OfferStatus.VIEWED]: [
    OfferStatus.ACCEPTED,
    OfferStatus.REJECTED,
    OfferStatus.EXPIRED,
    OfferStatus.CANCELLED,
  ],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.EXPIRED]: [],
  [OfferStatus.CANCELLED]: [OfferStatus.DRAFT],
};
