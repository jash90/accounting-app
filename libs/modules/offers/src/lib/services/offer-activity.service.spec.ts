import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  type Offer,
  OfferActivity,
  OfferActivityType,
  OfferStatus,
  type User,
} from '@accounting/common';

import { OfferActivityService } from './offer-activity.service';

describe('OfferActivityService', () => {
  let service: OfferActivityService;
  let activityRepository: jest.Mocked<Repository<OfferActivity>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  const mockOffer = {
    id: 'offer-1',
    companyId,
    offerNumber: 'OF/2026/001',
    title: 'Usługi księgowe',
  } as unknown as Offer;

  beforeEach(async () => {
    jest.clearAllMocks();

    activityRepository = {
      create: jest.fn().mockImplementation((data: Partial<OfferActivity>) => data),
      save: jest.fn().mockImplementation((data: unknown) =>
        Promise.resolve({ ...(data as object), id: 'activity-1' })
      ),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<OfferActivity>>;

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: OfferActivityService,
          useFactory: () => new OfferActivityService(activityRepository as any),
        },
        { provide: getRepositoryToken(OfferActivity), useValue: activityRepository },
      ],
    }).compile();

    service = module.get(OfferActivityService);
  });

  describe('logCreated', () => {
    it('should log CREATED activity with offer number in description', async () => {
      await service.logCreated(mockOffer, mockUser);

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          offerId: 'offer-1',
          activityType: OfferActivityType.CREATED,
          companyId,
          performedById: mockUser.id,
        })
      );
      expect(activityRepository.save).toHaveBeenCalled();
    });
  });

  describe('logUpdated', () => {
    it('should log UPDATED activity with changes metadata', async () => {
      const changes = { title: { old: 'Old Title', new: 'New Title' } };

      await service.logUpdated(mockOffer, mockUser, changes);

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: OfferActivityType.UPDATED,
          metadata: { changes },
        })
      );
    });
  });

  describe('logStatusChanged', () => {
    it('should log STATUS_CHANGED with previous and new status', async () => {
      await service.logStatusChanged(
        mockOffer,
        mockUser,
        OfferStatus.DRAFT,
        OfferStatus.SENT
      );

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: OfferActivityType.STATUS_CHANGED,
          metadata: { previousStatus: OfferStatus.DRAFT, newStatus: OfferStatus.SENT },
        })
      );
    });
  });

  describe('logEmailSent', () => {
    it('should log EMAIL_SENT with recipient and subject metadata', async () => {
      await service.logEmailSent(mockOffer, mockUser, 'client@test.pl', 'Oferta');

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: OfferActivityType.EMAIL_SENT,
          metadata: { emailRecipient: 'client@test.pl', emailSubject: 'Oferta' },
        })
      );
    });
  });

  describe('logDuplicated', () => {
    it('should log DUPLICATED with source offer ID', async () => {
      await service.logDuplicated(mockOffer, mockUser, 'source-offer-1');

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: OfferActivityType.DUPLICATED,
          metadata: { duplicatedFromOfferId: 'source-offer-1' },
        })
      );
    });
  });

  describe('getOfferActivities', () => {
    it('should query activities by offerId and companyId ordered by createdAt DESC', async () => {
      const activities = [{ id: 'a-1' }] as OfferActivity[];
      activityRepository.find.mockResolvedValue(activities);

      const result = await service.getOfferActivities('offer-1', companyId);

      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { offerId: 'offer-1', companyId },
        relations: ['performedBy'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(activities);
    });
  });
});
