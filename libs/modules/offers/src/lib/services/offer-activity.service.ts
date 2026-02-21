import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  ActivityMetadata,
  Offer,
  OfferActivity,
  OfferActivityType,
  OfferStatus,
  User,
} from '@accounting/common';

@Injectable()
export class OfferActivityService {
  constructor(
    @InjectRepository(OfferActivity)
    private readonly activityRepository: Repository<OfferActivity>
  ) {}

  async logActivity(
    offer: Offer,
    activityType: OfferActivityType,
    user: User,
    description?: string,
    metadata?: ActivityMetadata
  ): Promise<OfferActivity> {
    const activity = this.activityRepository.create({
      offerId: offer.id,
      activityType,
      description,
      metadata,
      companyId: offer.companyId,
      performedById: user.id,
    });

    return this.activityRepository.save(activity);
  }

  async logCreated(offer: Offer, user: User): Promise<OfferActivity> {
    return this.logActivity(
      offer,
      OfferActivityType.CREATED,
      user,
      `Utworzono ofertę ${offer.offerNumber}`
    );
  }

  async logUpdated(
    offer: Offer,
    user: User,
    changes: Record<string, { old: unknown; new: unknown }>
  ): Promise<OfferActivity> {
    return this.logActivity(
      offer,
      OfferActivityType.UPDATED,
      user,
      `Zaktualizowano ofertę ${offer.offerNumber}`,
      { changes }
    );
  }

  async logStatusChanged(
    offer: Offer,
    user: User,
    previousStatus: OfferStatus,
    newStatus: OfferStatus
  ): Promise<OfferActivity> {
    return this.logActivity(
      offer,
      OfferActivityType.STATUS_CHANGED,
      user,
      `Zmieniono status oferty z ${previousStatus} na ${newStatus}`,
      { previousStatus, newStatus }
    );
  }

  async logDocumentGenerated(
    offer: Offer,
    user: User,
    documentPath: string
  ): Promise<OfferActivity> {
    return this.logActivity(
      offer,
      OfferActivityType.DOCUMENT_GENERATED,
      user,
      `Wygenerowano dokument oferty`,
      { documentPath }
    );
  }

  async logEmailSent(
    offer: Offer,
    user: User,
    emailRecipient: string,
    emailSubject: string
  ): Promise<OfferActivity> {
    return this.logActivity(
      offer,
      OfferActivityType.EMAIL_SENT,
      user,
      `Wysłano ofertę emailem do ${emailRecipient}`,
      { emailRecipient, emailSubject }
    );
  }

  async logViewed(offer: Offer, user: User): Promise<OfferActivity> {
    return this.logActivity(offer, OfferActivityType.VIEWED, user, `Oferta została wyświetlona`);
  }

  async logDuplicated(offer: Offer, user: User, sourceOfferId: string): Promise<OfferActivity> {
    return this.logActivity(offer, OfferActivityType.DUPLICATED, user, `Zduplikowano ofertę`, {
      duplicatedFromOfferId: sourceOfferId,
    });
  }

  async logComment(offer: Offer, user: User, comment: string): Promise<OfferActivity> {
    return this.logActivity(offer, OfferActivityType.COMMENT_ADDED, user, comment, { comment });
  }

  async getOfferActivities(offerId: string, companyId: string): Promise<OfferActivity[]> {
    return this.activityRepository.find({
      where: { offerId, companyId },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
