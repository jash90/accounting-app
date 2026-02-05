import type { Offer, OfferStatus, User } from '@accounting/common';

/**
 * Event payload for offer creation.
 * Emitted after an offer is successfully created.
 */
export class OfferCreatedEvent {
  static readonly eventName = 'offer.created' as const;

  constructor(
    public readonly offer: Offer,
    public readonly actor: User
  ) {}
}

/**
 * Event payload for offer status change.
 * Emitted after an offer's status is successfully updated.
 */
export class OfferStatusChangedEvent {
  static readonly eventName = 'offer.statusChanged' as const;

  constructor(
    public readonly offer: Offer,
    public readonly previousStatus: OfferStatus,
    public readonly newStatus: OfferStatus,
    public readonly actor: User
  ) {}
}

/**
 * Event payload for offer update.
 * Emitted after an offer is successfully updated (excluding status changes).
 */
export class OfferUpdatedEvent {
  static readonly eventName = 'offer.updated' as const;

  constructor(
    public readonly offer: Offer,
    public readonly changes: Record<string, { old: unknown; new: unknown }>,
    public readonly actor: User
  ) {}
}

/**
 * Event payload for offer document generation.
 * Emitted after a document is generated for an offer.
 */
export class OfferDocumentGeneratedEvent {
  static readonly eventName = 'offer.documentGenerated' as const;

  constructor(
    public readonly offer: Offer,
    public readonly documentPath: string,
    public readonly actor: User
  ) {}
}

/**
 * Event payload for offer email sent.
 * Emitted after an offer is sent via email.
 */
export class OfferEmailSentEvent {
  static readonly eventName = 'offer.emailSent' as const;

  constructor(
    public readonly offer: Offer,
    public readonly emailRecipient: string,
    public readonly emailSubject: string,
    public readonly actor: User
  ) {}
}

/**
 * Event payload for offer duplication.
 * Emitted after an offer is duplicated.
 */
export class OfferDuplicatedEvent {
  static readonly eventName = 'offer.duplicated' as const;

  constructor(
    public readonly newOffer: Offer,
    public readonly sourceOfferId: string,
    public readonly actor: User
  ) {}
}

/**
 * Union type of all offer events for type-safe event handling.
 */
export type OfferEvent =
  | OfferCreatedEvent
  | OfferStatusChangedEvent
  | OfferUpdatedEvent
  | OfferDocumentGeneratedEvent
  | OfferEmailSentEvent
  | OfferDuplicatedEvent;

/**
 * All offer event names for use with @OnEvent decorator.
 */
export const OFFER_EVENTS = {
  CREATED: OfferCreatedEvent.eventName,
  STATUS_CHANGED: OfferStatusChangedEvent.eventName,
  UPDATED: OfferUpdatedEvent.eventName,
  DOCUMENT_GENERATED: OfferDocumentGeneratedEvent.eventName,
  EMAIL_SENT: OfferEmailSentEvent.eventName,
  DUPLICATED: OfferDuplicatedEvent.eventName,
} as const;
