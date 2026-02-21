import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  OFFER_EVENTS,
  OfferCreatedEvent,
  OfferDocumentGeneratedEvent,
  OfferDuplicatedEvent,
  OfferEmailSentEvent,
  OfferStatusChangedEvent,
  OfferUpdatedEvent,
} from '../events/offer.events';
import { OfferActivityService } from '../services/offer-activity.service';

/**
 * Event listener for offer-related events.
 * Handles async activity logging without blocking the main request flow.
 *
 * Benefits:
 * - Decouples activity logging from core business logic
 * - Enables async processing for better performance
 * - Makes it easy to add additional event handlers (e.g., notifications, analytics)
 */
@Injectable()
export class OfferActivityListener {
  private readonly logger = new Logger(OfferActivityListener.name);

  constructor(private readonly offerActivityService: OfferActivityService) {}

  @OnEvent(OFFER_EVENTS.CREATED, { async: true })
  async handleOfferCreated(event: OfferCreatedEvent): Promise<void> {
    try {
      await this.offerActivityService.logCreated(event.offer, event.actor);
      this.logger.debug(`Activity logged for offer creation: ${event.offer.offerNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log offer creation activity: ${(error as Error).message}`, {
        offerId: event.offer.id,
        offerNumber: event.offer.offerNumber,
      });
    }
  }

  @OnEvent(OFFER_EVENTS.STATUS_CHANGED, { async: true })
  async handleOfferStatusChanged(event: OfferStatusChangedEvent): Promise<void> {
    try {
      await this.offerActivityService.logStatusChanged(
        event.offer,
        event.actor,
        event.previousStatus,
        event.newStatus
      );
      this.logger.debug(
        `Activity logged for status change: ${event.offer.offerNumber} (${event.previousStatus} → ${event.newStatus})`
      );
    } catch (error) {
      this.logger.error(`Failed to log status change activity: ${(error as Error).message}`, {
        offerId: event.offer.id,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
      });
    }
  }

  @OnEvent(OFFER_EVENTS.UPDATED, { async: true })
  async handleOfferUpdated(event: OfferUpdatedEvent): Promise<void> {
    try {
      await this.offerActivityService.logUpdated(event.offer, event.actor, event.changes);
      this.logger.debug(`Activity logged for offer update: ${event.offer.offerNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log offer update activity: ${(error as Error).message}`, {
        offerId: event.offer.id,
        changesCount: Object.keys(event.changes).length,
      });
    }
  }

  @OnEvent(OFFER_EVENTS.DOCUMENT_GENERATED, { async: true })
  async handleDocumentGenerated(event: OfferDocumentGeneratedEvent): Promise<void> {
    try {
      await this.offerActivityService.logDocumentGenerated(
        event.offer,
        event.actor,
        event.documentPath
      );
      this.logger.debug(`Activity logged for document generation: ${event.offer.offerNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log document generation activity: ${(error as Error).message}`, {
        offerId: event.offer.id,
        documentPath: event.documentPath,
      });
    }
  }

  @OnEvent(OFFER_EVENTS.EMAIL_SENT, { async: true })
  async handleEmailSent(event: OfferEmailSentEvent): Promise<void> {
    try {
      await this.offerActivityService.logEmailSent(
        event.offer,
        event.actor,
        event.emailRecipient,
        event.emailSubject
      );
      this.logger.debug(`Activity logged for email sent: ${event.offer.offerNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log email sent activity: ${(error as Error).message}`, {
        offerId: event.offer.id,
        emailRecipient: event.emailRecipient,
      });
    }
  }

  @OnEvent(OFFER_EVENTS.DUPLICATED, { async: true })
  async handleOfferDuplicated(event: OfferDuplicatedEvent): Promise<void> {
    try {
      await this.offerActivityService.logDuplicated(
        event.newOffer,
        event.actor,
        event.sourceOfferId
      );
      this.logger.debug(`Activity logged for offer duplication: ${event.newOffer.offerNumber}`);
    } catch (error) {
      this.logger.error(`Failed to log offer duplication activity: ${(error as Error).message}`, {
        newOfferId: event.newOffer.id,
        sourceOfferId: event.sourceOfferId,
      });
    }
  }
}
