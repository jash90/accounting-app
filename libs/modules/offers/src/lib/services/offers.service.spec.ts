import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  Client,
  Lead,
  LeadStatus,
  Offer,
  OfferStatus,
  OfferTemplate,
  PaginatedResponseDto,
  UserRole,
  type User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { StorageService } from '@accounting/infrastructure/storage';

import { DocxGenerationService } from './docx-generation.service';
import { LeadsService } from './leads.service';
import { OfferActivityService } from './offer-activity.service';
import { OfferEmailService } from './offer-email.service';
import { OfferNumberingService } from './offer-numbering.service';
import { OfferTemplatesService } from './offer-templates.service';
import { OffersService } from './offers.service';
import {
  ClientNotFoundException,
  LeadNotFoundException,
  OfferCannotModifyException,
  OfferDocumentNotGeneratedException,
  OfferInvalidStatusTransitionException,
  OfferNoRecipientException,
  OfferNotFoundException,
} from '../exceptions/offer.exception';

describe('OffersService', () => {
  let service: OffersService;
  let _offerRepository: jest.Mocked<Repository<Offer>>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockClient: Partial<Client> = {
    id: 'client-123',
    name: 'Test Client Sp. z o.o.',
    nip: '1234567890',
    email: 'client@test.com',
    phone: '+48123456789',
    companyId: mockCompanyId,
  };

  const mockLead: Partial<Lead> = {
    id: 'lead-123',
    name: 'Test Lead',
    nip: '9876543210',
    regon: '123456789',
    street: 'ul. Testowa 1',
    postalCode: '00-001',
    city: 'Warszawa',
    country: 'PL',
    contactPerson: 'Jan Kowalski',
    contactPosition: 'Dyrektor',
    email: 'lead@test.com',
    phone: '+48987654321',
    companyId: mockCompanyId,
  };

  const mockOffer: Partial<Offer> = {
    id: 'offer-123',
    offerNumber: 'OF/2026/001',
    title: 'Oferta testowa',
    description: 'Opis testowy',
    status: OfferStatus.DRAFT,
    clientId: 'client-123',
    recipientSnapshot: {
      name: 'Test Client Sp. z o.o.',
      nip: '1234567890',
      email: 'client@test.com',
      phone: '+48123456789',
    },
    totalNetAmount: 1000,
    vatRate: 23,
    totalGrossAmount: 1230,
    serviceTerms: {
      items: [
        { name: 'Usługa A', unitPrice: 500, quantity: 2, netAmount: 1000 },
      ],
    },
    offerDate: new Date('2026-03-01'),
    validUntil: new Date('2026-03-31'),
    companyId: mockCompanyId,
    createdById: mockUserId,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockOffer], 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  // Service mocks
  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const mockOfferNumberingService = {
    generateOfferNumber: jest.fn(),
  };

  const mockOfferActivityService = {
    getOfferActivities: jest.fn(),
  };

  const mockOfferTemplatesService = {};

  const mockDocxGenerationService = {
    buildPlaceholderData: jest.fn(),
    generateFromBlocks: jest.fn(),
    generateFromTemplate: jest.fn(),
    generateSimpleDocument: jest.fn(),
  };

  const mockOfferEmailService = {
    sendOffer: jest.fn(),
  };

  const mockLeadsService = {
    update: jest.fn(),
  };

  const mockStorageService = {
    uploadBuffer: jest.fn(),
    deleteFile: jest.fn(),
    downloadFile: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockTransactionManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((_isolation: string, callback: any) =>
      callback(mockTransactionManager)
    ),
  };

  let mockOfferRepository: any;
  let mockClientRepository: any;
  let mockLeadRepository: any;
  let mockTemplateRepository: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    const mockQueryBuilder = createMockQueryBuilder();

    mockOfferRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    mockClientRepository = {
      findOne: jest.fn(),
    };

    mockLeadRepository = {
      findOne: jest.fn(),
    };

    mockTemplateRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: OffersService,
          useFactory: () => {
            return new OffersService(
              mockOfferRepository as any,
              mockClientRepository as any,
              mockLeadRepository as any,
              mockTemplateRepository as any,
              mockSystemCompanyService as any,
              mockOfferNumberingService as any,
              mockOfferActivityService as any,
              mockOfferTemplatesService as any,
              mockDocxGenerationService as any,
              mockOfferEmailService as any,
              mockLeadsService as any,
              mockStorageService as any,
              mockEventEmitter as any,
              mockDataSource as any
            );
          },
        },
        { provide: getRepositoryToken(Offer), useValue: mockOfferRepository },
        { provide: getRepositoryToken(Client), useValue: mockClientRepository },
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepository },
        { provide: getRepositoryToken(OfferTemplate), useValue: mockTemplateRepository },
        { provide: SystemCompanyService, useValue: mockSystemCompanyService },
        { provide: OfferNumberingService, useValue: mockOfferNumberingService },
        { provide: OfferActivityService, useValue: mockOfferActivityService },
        { provide: OfferTemplatesService, useValue: mockOfferTemplatesService },
        { provide: DocxGenerationService, useValue: mockDocxGenerationService },
        { provide: OfferEmailService, useValue: mockOfferEmailService },
        { provide: LeadsService, useValue: mockLeadsService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
    _offerRepository = module.get(getRepositoryToken(Offer));
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated offers for company', async () => {
      const result = await service.findAll(mockUser as User, {} as any);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockSystemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by companyId in the where clause', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, {} as any);

      expect(mockQb.where).toHaveBeenCalledWith('offer.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should apply search filter with ILIKE and escaping', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, { search: 'Test%Offer' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(expect.any(Object)); // Brackets
    });

    it('should escape percent in search pattern', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      // The Brackets callback will call the inner qb methods.
      // We verify andWhere was called (Brackets instance passed).
      await service.findAll(mockUser as User, { search: '50%' } as any);

      expect(mockQb.andWhere).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, { status: OfferStatus.DRAFT } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.status = :status', {
        status: OfferStatus.DRAFT,
      });
    });

    it('should apply multiple statuses filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, {
        statuses: [OfferStatus.DRAFT, OfferStatus.SENT],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.status IN (:...statuses)', {
        statuses: [OfferStatus.DRAFT, OfferStatus.SENT],
      });
    });

    it('should apply clientId filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, { clientId: 'client-123' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.clientId = :clientId', {
        clientId: 'client-123',
      });
    });

    it('should apply date range filters', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, {
        offerDateFrom: '2026-01-01',
        offerDateTo: '2026-12-31',
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.offerDate >= :offerDateFrom', {
        offerDateFrom: '2026-01-01',
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.offerDate <= :offerDateTo', {
        offerDateTo: '2026-12-31',
      });
    });

    it('should apply amount range filters', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, { minAmount: 100, maxAmount: 5000 } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.totalNetAmount >= :minAmount', {
        minAmount: 100,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('offer.totalNetAmount <= :maxAmount', {
        maxAmount: 5000,
      });
    });

    it('should apply pagination correctly', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, { page: 3, limit: 10 } as any);

      expect(mockQb.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should order results by createdAt descending', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, {} as any);

      expect(mockQb.orderBy).toHaveBeenCalledWith('offer.createdAt', 'DESC');
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return offer when found', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue(mockOffer);

      const result = await service.findOne('offer-123', mockUser as User);

      expect(result).toEqual(mockOffer);
      expect(mockOfferRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'offer-123', companyId: mockCompanyId },
        relations: ['client', 'lead', 'template', 'createdBy', 'updatedBy', 'sentBy'],
      });
    });

    it('should throw OfferNotFoundException when not found', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser as User)).rejects.toThrow(
        OfferNotFoundException
      );
    });

    it('should use SystemCompanyService for tenant isolation', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue(mockOffer);

      await service.findOne('offer-123', mockUser as User);

      expect(mockSystemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      title: 'Nowa oferta',
      clientId: 'client-123',
      serviceTerms: {
        items: [{ name: 'Usługa', unitPrice: 500, quantity: 2 }],
      },
    };

    beforeEach(() => {
      mockClientRepository.findOne = jest.fn().mockResolvedValue(mockClient);
      mockOfferNumberingService.generateOfferNumber.mockResolvedValue('OF/2026/002');
      mockTransactionManager.create.mockReturnValue({ ...mockOffer, id: 'offer-new' });
      mockTransactionManager.save.mockResolvedValue({ ...mockOffer, id: 'offer-new' });
      // findOne after save
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        id: 'offer-new',
        client: mockClient,
      });
    });

    it('should create offer with client recipient', async () => {
      const result = await service.create(createDto as any, mockUser as User);

      expect(result).toBeDefined();
      expect(mockClientRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-123', companyId: mockCompanyId },
      });
      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          title: 'Nowa oferta',
          status: OfferStatus.DRAFT,
          companyId: mockCompanyId,
          createdById: mockUserId,
        })
      );
    });

    it('should create offer with lead recipient', async () => {
      const leadDto = { title: 'Oferta lead', leadId: 'lead-123' };
      mockClientRepository.findOne = jest.fn().mockResolvedValue(null);
      mockLeadRepository.findOne = jest.fn().mockResolvedValue(mockLead);

      await service.create(leadDto as any, mockUser as User);

      expect(mockLeadRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'lead-123', companyId: mockCompanyId },
      });
      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          recipientSnapshot: expect.objectContaining({ name: 'Test Lead' }),
        })
      );
    });

    it('should throw OfferNoRecipientException when no client and no lead', async () => {
      const noRecipientDto = { title: 'Oferta' };

      await expect(service.create(noRecipientDto as any, mockUser as User)).rejects.toThrow(
        OfferNoRecipientException
      );
    });

    it('should throw ClientNotFoundException when client not found', async () => {
      mockClientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create({ title: 'X', clientId: 'bad-id' } as any, mockUser as User)
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('should throw LeadNotFoundException when lead not found', async () => {
      mockLeadRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.create({ title: 'X', leadId: 'bad-id' } as any, mockUser as User)
      ).rejects.toThrow(LeadNotFoundException);
    });

    it('should calculate totals using Decimal precision', async () => {
      const dto = {
        title: 'Precyzyjna',
        clientId: 'client-123',
        vatRate: 23,
        serviceTerms: {
          items: [
            { name: 'A', unitPrice: 33.33, quantity: 3 },
            { name: 'B', unitPrice: 16.67, quantity: 1 },
          ],
        },
      };

      await service.create(dto as any, mockUser as User);

      // 33.33 * 3 = 99.99, 16.67 * 1 = 16.67, total net = 116.66
      // gross = 116.66 * 1.23 = 143.4918 → 143.49
      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          totalNetAmount: 116.66,
          totalGrossAmount: 143.49,
        })
      );
    });

    it('should generate sequential offer number inside SERIALIZABLE transaction', async () => {
      await service.create(createDto as any, mockUser as User);

      expect(mockDataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
      expect(mockOfferNumberingService.generateOfferNumber).toHaveBeenCalledWith(
        mockCompanyId,
        mockTransactionManager
      );
    });

    it('should emit CREATED event after save', async () => {
      await service.create(createDto as any, mockUser as User);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'offer.created',
        expect.objectContaining({ actor: mockUser })
      );
    });

    it('should use template defaults for vatRate and validityDays', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        companyId: mockCompanyId,
        defaultVatRate: 8,
        defaultValidityDays: 14,
      };
      mockTemplateRepository.findOne = jest.fn().mockResolvedValue(mockTemplate);

      const dto = { title: 'Z szablonu', clientId: 'client-123', templateId: 'tpl-1' };
      await service.create(dto as any, mockUser as User);

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          vatRate: 8,
          templateId: 'tpl-1',
        })
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      // findOne returns DRAFT offer
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({ ...mockOffer });
      mockOfferRepository.save = jest.fn().mockImplementation((offer) =>
        Promise.resolve({ ...offer, id: 'offer-123' })
      );
    });

    it('should update title and emit event', async () => {
      const dto = { title: 'Zmieniony tytuł' };

      await service.update('offer-123', dto as any, mockUser as User);

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Zmieniony tytuł', updatedById: mockUserId })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'offer.updated',
        expect.objectContaining({
          changes: expect.objectContaining({
            title: { old: 'Oferta testowa', new: 'Zmieniony tytuł' },
          }),
        })
      );
    });

    it('should throw OfferCannotModifyException for SENT offers', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.SENT,
      });

      await expect(
        service.update('offer-123', { title: 'X' } as any, mockUser as User)
      ).rejects.toThrow(OfferCannotModifyException);
    });

    it('should allow modification of DRAFT offers', async () => {
      await expect(
        service.update('offer-123', { title: 'Nowy' } as any, mockUser as User)
      ).resolves.toBeDefined();
    });

    it('should allow modification of READY offers', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.READY,
      });

      await expect(
        service.update('offer-123', { title: 'Nowy' } as any, mockUser as User)
      ).resolves.toBeDefined();
    });

    it('should recalculate totals when serviceTerms change', async () => {
      const dto = {
        serviceTerms: {
          items: [{ name: 'Nowa', unitPrice: 200, quantity: 5 }],
        },
      };

      await service.update('offer-123', dto as any, mockUser as User);

      // 200 * 5 = 1000 net, 1000 * 1.23 = 1230 gross
      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalNetAmount: 1000,
          totalGrossAmount: 1230,
        })
      );
    });

    it('should update recipient when clientId changes', async () => {
      const newClient = { ...mockClient, id: 'client-456', name: 'Nowy Klient' };
      mockClientRepository.findOne = jest.fn().mockResolvedValue(newClient);

      await service.update('offer-123', { clientId: 'client-456' } as any, mockUser as User);

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientSnapshot: expect.objectContaining({ name: 'Nowy Klient' }),
        })
      );
    });

    it('should not emit event when no changes detected', async () => {
      // Pass same title as existing
      const dto = { title: 'Oferta testowa' };

      await service.update('offer-123', dto as any, mockUser as User);

      // emit should not be called for UPDATED event (no changes)
      const updatedCalls = mockEventEmitter.emit.mock.calls.filter(
        ([event]: string[]) => event === 'offer.updated'
      );
      expect(updatedCalls).toHaveLength(0);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    beforeEach(() => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({ ...mockOffer });
      mockOfferRepository.save = jest.fn().mockImplementation((offer) =>
        Promise.resolve({ ...offer })
      );
    });

    it('should transition DRAFT -> READY', async () => {
      await service.updateStatus(
        'offer-123',
        { status: OfferStatus.READY } as any,
        mockUser as User
      );

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.READY })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'offer.statusChanged',
        expect.objectContaining({
          previousStatus: OfferStatus.DRAFT,
          newStatus: OfferStatus.READY,
        })
      );
    });

    it('should transition DRAFT -> CANCELLED', async () => {
      await service.updateStatus(
        'offer-123',
        { status: OfferStatus.CANCELLED } as any,
        mockUser as User
      );

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.CANCELLED })
      );
    });

    it('should reject invalid transition DRAFT -> ACCEPTED', async () => {
      await expect(
        service.updateStatus(
          'offer-123',
          { status: OfferStatus.ACCEPTED } as any,
          mockUser as User
        )
      ).rejects.toThrow(OfferInvalidStatusTransitionException);
    });

    it('should reject invalid transition ACCEPTED -> DRAFT', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.ACCEPTED,
      });

      await expect(
        service.updateStatus(
          'offer-123',
          { status: OfferStatus.DRAFT } as any,
          mockUser as User
        )
      ).rejects.toThrow(OfferInvalidStatusTransitionException);
    });

    it('should allow SENT -> ACCEPTED transition', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.SENT,
      });

      await service.updateStatus(
        'offer-123',
        { status: OfferStatus.ACCEPTED } as any,
        mockUser as User
      );

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.ACCEPTED })
      );
    });

    it('should allow SENT -> REJECTED transition', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.SENT,
      });

      await service.updateStatus(
        'offer-123',
        { status: OfferStatus.REJECTED } as any,
        mockUser as User
      );

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.REJECTED })
      );
    });

    it('should allow SENT -> EXPIRED transition', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.SENT,
      });

      await service.updateStatus(
        'offer-123',
        { status: OfferStatus.EXPIRED } as any,
        mockUser as User
      );

      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.EXPIRED })
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove offer', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({ ...mockOffer });
      mockOfferRepository.remove = jest.fn().mockResolvedValue(mockOffer);

      await service.remove('offer-123', mockUser as User);

      expect(mockOfferRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'offer-123' })
      );
    });

    it('should delete generated document from storage if exists', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        generatedDocumentPath: 'offers/company-123/offer-123/doc.docx',
      });
      mockOfferRepository.remove = jest.fn().mockResolvedValue(mockOffer);

      await service.remove('offer-123', mockUser as User);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'offers/company-123/offer-123/doc.docx'
      );
    });

    it('should not fail if storage deletion fails', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        generatedDocumentPath: 'path/to/doc.docx',
      });
      mockOfferRepository.remove = jest.fn().mockResolvedValue(mockOffer);
      mockStorageService.deleteFile.mockRejectedValue(new Error('Storage error'));

      await expect(service.remove('offer-123', mockUser as User)).resolves.not.toThrow();
    });

    it('should throw OfferNotFoundException when offer does not exist', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUser as User)).rejects.toThrow(
        OfferNotFoundException
      );
    });
  });

  // ─── sendOffer ────────────────────────────────────────────────────────────────

  describe('sendOffer', () => {
    const sendDto = {
      email: 'recipient@test.com',
      subject: 'Oferta dla Ciebie',
      body: 'Treść emaila',
    };

    beforeEach(() => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({ ...mockOffer });
      mockOfferRepository.save = jest.fn().mockImplementation((offer) =>
        Promise.resolve({ ...offer })
      );
      mockOfferEmailService.sendOffer.mockResolvedValue({ sentAt: new Date('2026-03-09') });
    });

    it('should send offer email and update status to SENT', async () => {
      await service.sendOffer('offer-123', sendDto as any, mockUser as User);

      expect(mockOfferEmailService.sendOffer).toHaveBeenCalled();
      expect(mockOfferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OfferStatus.SENT,
          sentToEmail: 'recipient@test.com',
          sentById: mockUserId,
          emailSubject: 'Oferta dla Ciebie',
          emailBody: 'Treść emaila',
        })
      );
    });

    it('should emit EMAIL_SENT event', async () => {
      await service.sendOffer('offer-123', sendDto as any, mockUser as User);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'offer.emailSent',
        expect.objectContaining({ recipientEmail: 'recipient@test.com' })
      );
    });

    it('should update lead status to PROPOSAL_SENT when offer has leadId', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        leadId: 'lead-123',
      });

      await service.sendOffer('offer-123', sendDto as any, mockUser as User);

      expect(mockLeadsService.update).toHaveBeenCalledWith(
        'lead-123',
        { status: LeadStatus.PROPOSAL_SENT },
        mockUser
      );
    });

    it('should not update lead status when offer has no leadId', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        leadId: undefined,
      });

      await service.sendOffer('offer-123', sendDto as any, mockUser as User);

      expect(mockLeadsService.update).not.toHaveBeenCalled();
    });
  });

  // ─── duplicate ────────────────────────────────────────────────────────────────

  describe('duplicate', () => {
    beforeEach(() => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({ ...mockOffer });
      mockOfferNumberingService.generateOfferNumber.mockResolvedValue('OF/2026/003');
      mockTransactionManager.create.mockReturnValue({ ...mockOffer, id: 'offer-dup' });
      mockTransactionManager.save.mockResolvedValue({ ...mockOffer, id: 'offer-dup' });
    });

    it('should duplicate offer with new number and DRAFT status', async () => {
      await service.duplicate('offer-123', {} as any, mockUser as User);

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          offerNumber: 'OF/2026/003',
          status: OfferStatus.DRAFT,
          companyId: mockCompanyId,
          createdById: mockUserId,
        })
      );
    });

    it('should copy service terms and amounts from source offer', async () => {
      await service.duplicate('offer-123', {} as any, mockUser as User);

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          serviceTerms: mockOffer.serviceTerms,
          totalNetAmount: mockOffer.totalNetAmount,
          totalGrossAmount: mockOffer.totalGrossAmount,
        })
      );
    });

    it('should use custom title when provided', async () => {
      await service.duplicate(
        'offer-123',
        { title: 'Kopia oferty' } as any,
        mockUser as User
      );

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({ title: 'Kopia oferty' })
      );
    });

    it('should change recipient when new clientId provided', async () => {
      const newClient = { ...mockClient, id: 'client-456', name: 'Inny Klient' };
      mockClientRepository.findOne = jest.fn().mockResolvedValue(newClient);

      await service.duplicate(
        'offer-123',
        { clientId: 'client-456' } as any,
        mockUser as User
      );

      expect(mockTransactionManager.create).toHaveBeenCalledWith(
        Offer,
        expect.objectContaining({
          clientId: 'client-456',
          recipientSnapshot: expect.objectContaining({ name: 'Inny Klient' }),
        })
      );
    });

    it('should emit DUPLICATED event', async () => {
      await service.duplicate('offer-123', {} as any, mockUser as User);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'offer.duplicated',
        expect.objectContaining({ sourceOfferId: 'offer-123' })
      );
    });

    it('should generate number inside SERIALIZABLE transaction', async () => {
      await service.duplicate('offer-123', {} as any, mockUser as User);

      expect(mockDataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    });
  });

  // ─── downloadDocument ─────────────────────────────────────────────────────────

  describe('downloadDocument', () => {
    it('should return buffer and fileName when document exists', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        generatedDocumentPath: 'offers/doc.docx',
        generatedDocumentName: 'Oferta_OF_2026_001.docx',
      });
      mockStorageService.downloadFile.mockResolvedValue(Buffer.from('test'));

      const result = await service.downloadDocument('offer-123', mockUser as User);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.fileName).toBe('Oferta_OF_2026_001.docx');
    });

    it('should throw OfferDocumentNotGeneratedException when no document', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue({
        ...mockOffer,
        generatedDocumentPath: null,
      });

      await expect(
        service.downloadDocument('offer-123', mockUser as User)
      ).rejects.toThrow(OfferDocumentNotGeneratedException);
    });
  });

  // ─── getStatistics ────────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        { status: 'DRAFT', count: '5', totalValue: '10000' },
        { status: 'SENT', count: '3', totalValue: '7500' },
        { status: 'ACCEPTED', count: '2', totalValue: '5000' },
        { status: 'REJECTED', count: '1', totalValue: '2000' },
      ]);
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      const result = await service.getStatistics(mockUser as User);

      expect(result.totalOffers).toBe(11);
      expect(result.draftCount).toBe(5);
      expect(result.sentCount).toBe(3);
      expect(result.acceptedCount).toBe(2);
      expect(result.rejectedCount).toBe(1);
      expect(result.totalValue).toBe(24500);
      expect(result.acceptedValue).toBe(5000);
      // conversionRate = 2 / (2+1) * 100 = 66.67
      expect(result.conversionRate).toBe(66.67);
    });

    it('should handle zero offers gracefully', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([]);
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      const result = await service.getStatistics(mockUser as User);

      expect(result.totalOffers).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  // ─── Tenant isolation ─────────────────────────────────────────────────────────

  describe('Tenant isolation', () => {
    it('should always resolve companyId via SystemCompanyService', async () => {
      mockOfferRepository.findOne = jest.fn().mockResolvedValue(mockOffer);

      await service.findOne('offer-123', mockUser as User);

      expect(mockSystemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });

    it('should filter findAll by companyId', async () => {
      const mockQb = createMockQueryBuilder();
      mockOfferRepository.createQueryBuilder = jest.fn(() => mockQb);

      await service.findAll(mockUser as User, {} as any);

      expect(mockQb.where).toHaveBeenCalledWith('offer.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });
  });
});
