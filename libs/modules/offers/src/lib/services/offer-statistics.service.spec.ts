import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Offer, OfferStatus, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { OfferStatisticsService } from './offer-statistics.service';

describe('OfferStatisticsService', () => {
  let service: OfferStatisticsService;
  let offerRepository: jest.Mocked<Repository<Offer>>;
  let _systemCompanyService: jest.Mocked<SystemCompanyService>;

  const mockCompanyId = 'company-123';
  const mockUser: Partial<User> = {
    id: 'user-123',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const createMockQueryBuilder = (rawMany: any[] = [], rawOne: any = null) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawMany),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
  });

  beforeEach(async () => {
    const queryBuilder = createMockQueryBuilder([
      { status: OfferStatus.DRAFT, count: '5', totalValue: '1000.50' },
      { status: OfferStatus.ACCEPTED, count: '3', totalValue: '5000.00' },
      { status: OfferStatus.REJECTED, count: '2', totalValue: '500.00' },
      { status: OfferStatus.SENT, count: '1', totalValue: '2000.00' },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferStatisticsService,
        {
          provide: getRepositoryToken(Offer),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: SystemCompanyService,
          useValue: {
            getCompanyIdForUser: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
      ],
    }).compile();

    service = module.get<OfferStatisticsService>(OfferStatisticsService);
    offerRepository = module.get(getRepositoryToken(Offer));
    _systemCompanyService = module.get(SystemCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      const result = await service.getStatistics(mockUser as User);

      expect(result.totalOffers).toBe(11);
      expect(result.draftCount).toBe(5);
      expect(result.acceptedCount).toBe(3);
      expect(result.rejectedCount).toBe(2);
      expect(result.sentCount).toBe(1);
    });

    it('should calculate total value', async () => {
      const result = await service.getStatistics(mockUser as User);
      expect(result.totalValue).toBe(8500.5);
    });

    it('should calculate accepted value', async () => {
      const result = await service.getStatistics(mockUser as User);
      expect(result.acceptedValue).toBe(5000.0);
    });

    it('should calculate conversion rate', async () => {
      const result = await service.getStatistics(mockUser as User);
      // accepted=3, rejected=2 → finished=5, rate = 3/5 * 100 = 60
      expect(result.conversionRate).toBe(60);
    });

    it('should return zero conversion rate when no finished offers', async () => {
      const queryBuilder = createMockQueryBuilder([
        { status: OfferStatus.DRAFT, count: '3', totalValue: '100' },
      ]);
      (offerRepository as any).createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getStatistics(mockUser as User);
      expect(result.conversionRate).toBe(0);
    });

    it('should default missing statuses to 0', async () => {
      const queryBuilder = createMockQueryBuilder([]);
      (offerRepository as any).createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getStatistics(mockUser as User);
      expect(result.totalOffers).toBe(0);
      expect(result.draftCount).toBe(0);
      expect(result.acceptedCount).toBe(0);
      expect(result.rejectedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
    });
  });
});
