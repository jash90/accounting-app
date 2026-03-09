import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Lead, Offer, type User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { OfferExportService } from './offer-export.service';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'createQueryBuilder',
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('OfferExportService', () => {
  let service: OfferExportService;
  let offerRepository: jest.Mocked<Repository<Offer>>;
  let leadRepository: jest.Mocked<Repository<Lead>>;
  let tenantService: jest.Mocked<Pick<TenantService, 'getEffectiveCompanyId'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  let offerQb: ReturnType<typeof createMockQueryBuilder>;
  let leadQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    offerQb = createMockQueryBuilder();
    leadQb = createMockQueryBuilder();

    offerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(offerQb),
    } as unknown as jest.Mocked<Repository<Offer>>;

    leadRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(leadQb),
    } as unknown as jest.Mocked<Repository<Lead>>;

    tenantService = {
      getEffectiveCompanyId: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: OfferExportService,
          useFactory: () =>
            new OfferExportService(
              offerRepository as any,
              leadRepository as any,
              tenantService as any
            ),
        },
        { provide: getRepositoryToken(Offer), useValue: offerRepository },
        { provide: getRepositoryToken(Lead), useValue: leadRepository },
        { provide: TenantService, useValue: tenantService },
      ],
    }).compile();

    service = module.get(OfferExportService);
  });

  describe('exportOffersToCsv', () => {
    it('should return Buffer with correct Polish headers', async () => {
      offerQb['getMany'].mockResolvedValue([]);

      const result = await service.exportOffersToCsv({} as any, mockUser);

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toContain('Numer');
      expect(content).toContain('Tytuł');
      expect(content).toContain('Klient');
      expect(content).toContain('Status');
      expect(content).toContain('Wartość netto');
      expect(content).toContain('Wartość brutto');
    });

    it('should include offer data in CSV output', async () => {
      const offers = [
        {
          offerNumber: 'OF/2026/001',
          title: 'Usługi księgowe',
          recipientSnapshot: { name: 'Firma ABC' },
          client: { name: 'Firma ABC' },
          status: 'DRAFT',
          totalNetAmount: 5000,
          totalGrossAmount: 6150,
          validUntil: new Date('2026-06-30'),
          offerDate: new Date('2026-03-01'),
          createdAt: new Date('2026-03-01'),
        },
      ] as unknown as Offer[];
      offerQb['getMany'].mockResolvedValue(offers);

      const result = await service.exportOffersToCsv({} as any, mockUser);
      const content = result.toString('utf-8');

      expect(content).toContain('OF/2026/001');
      expect(content).toContain('Usługi księgowe');
      expect(content).toContain('Firma ABC');
      expect(content).toContain('5000');
    });

    it('should apply status and clientId filters', async () => {
      offerQb['getMany'].mockResolvedValue([]);

      await service.exportOffersToCsv(
        { status: 'SENT', clientId: 'client-1' } as any,
        mockUser
      );

      expect(offerQb['andWhere']).toHaveBeenCalledWith('offer.status = :status', {
        status: 'SENT',
      });
      expect(offerQb['andWhere']).toHaveBeenCalledWith('offer.clientId = :clientId', {
        clientId: 'client-1',
      });
    });
  });

  describe('exportLeadsToCsv', () => {
    it('should return Buffer with correct Polish headers for leads', async () => {
      leadQb['getMany'].mockResolvedValue([]);

      const result = await service.exportLeadsToCsv({} as any, mockUser);

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toContain('Firma');
      expect(content).toContain('Osoba kontaktowa');
      expect(content).toContain('Email');
      expect(content).toContain('Telefon');
      expect(content).toContain('Źródło');
      expect(content).toContain('Przypisany do');
    });

    it('should apply lead filters (status, source, assignedToId)', async () => {
      leadQb['getMany'].mockResolvedValue([]);

      await service.exportLeadsToCsv(
        { status: 'NEW', source: 'WEBSITE', assignedToId: 'user-2' } as any,
        mockUser
      );

      expect(leadQb['andWhere']).toHaveBeenCalledWith('lead.status = :status', {
        status: 'NEW',
      });
      expect(leadQb['andWhere']).toHaveBeenCalledWith('lead.source = :source', {
        source: 'WEBSITE',
      });
      expect(leadQb['andWhere']).toHaveBeenCalledWith('lead.assignedToId = :assignedToId', {
        assignedToId: 'user-2',
      });
    });
  });
});
