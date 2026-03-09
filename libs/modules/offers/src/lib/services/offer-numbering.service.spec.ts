import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { Offer } from '@accounting/common';

import { OfferNumberingService } from './offer-numbering.service';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'createQueryBuilder',
    'where',
    'andWhere',
    'orderBy',
    'setParameter',
    'setLock',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getOne'] = jest.fn().mockResolvedValue(null);
  return qb;
}

describe('OfferNumberingService', () => {
  let service: OfferNumberingService;
  let offerRepository: jest.Mocked<Repository<Offer>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const companyId = 'company-1';
  const currentYear = new Date().getFullYear();

  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQb = createMockQueryBuilder();

    offerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as unknown as jest.Mocked<Repository<Offer>>;

    dataSource = {
      transaction: jest.fn().mockImplementation(
        (_isolation: string, cb: (manager: unknown) => unknown) => {
          const manager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          };
          return cb(manager);
        }
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: OfferNumberingService,
          useFactory: () =>
            new OfferNumberingService(offerRepository as any, dataSource as any),
        },
        { provide: getRepositoryToken(Offer), useValue: offerRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(OfferNumberingService);
  });

  describe('generateOfferNumber', () => {
    it('should generate OF/YYYY/001 when no previous offers exist', async () => {
      mockQb['getOne'].mockResolvedValue(null);

      const result = await service.generateOfferNumber(companyId);

      expect(result).toBe(`OF/${currentYear}/001`);
    });

    it('should increment from last offer number', async () => {
      const lastOffer = { offerNumber: `OF/${currentYear}/005` } as Offer;
      mockQb['getOne'].mockResolvedValue(lastOffer);

      const result = await service.generateOfferNumber(companyId);

      expect(result).toBe(`OF/${currentYear}/006`);
    });

    it('should pad number with leading zeros', async () => {
      const lastOffer = { offerNumber: `OF/${currentYear}/009` } as Offer;
      mockQb['getOne'].mockResolvedValue(lastOffer);

      const result = await service.generateOfferNumber(companyId);

      expect(result).toBe(`OF/${currentYear}/010`);
    });

    it('should use SERIALIZABLE transaction isolation', async () => {
      mockQb['getOne'].mockResolvedValue(null);

      await service.generateOfferNumber(companyId);

      expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    });

    it('should use provided entityManager instead of creating new transaction', async () => {
      const externalManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      };
      mockQb['getOne'].mockResolvedValue(null);

      const result = await service.generateOfferNumber(companyId, externalManager as any);

      expect(result).toBe(`OF/${currentYear}/001`);
      // Should NOT create its own transaction
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(externalManager.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
