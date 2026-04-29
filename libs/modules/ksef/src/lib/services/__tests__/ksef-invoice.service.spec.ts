import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';

import {
  Client,
  Company,
  KsefConfiguration,
  KsefInvoice,
  KsefInvoiceDirection,
  KsefInvoiceStatus,
  KsefInvoiceType,
  User,
  UserRole,
} from '@accounting/common';
import { EncryptionService, SystemCompanyService } from '@accounting/common/backend';

import { KsefInvoiceNotDraftException, KsefInvoiceNotFoundException } from '../../exceptions';
import { KsefAuditLogService } from '../ksef-audit-log.service';
import { KsefAuthService } from '../ksef-auth.service';
import { KsefConfigService } from '../ksef-config.service';
import { KsefCryptoService } from '../ksef-crypto.service';
import { KsefHttpClientService } from '../ksef-http-client.service';
import { KsefInvoiceService } from '../ksef-invoice.service';
import { KsefInvoiceValidationService } from '../ksef-invoice-validation.service';
import { KsefSessionService } from '../ksef-session.service';
import { KsefXmlService } from '../ksef-xml.service';

describe('KsefInvoiceService', () => {
  let service: KsefInvoiceService;
  let invoiceRepo: jest.Mocked<Repository<KsefInvoice>>;
  let clientRepo: jest.Mocked<Repository<Client>>;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let systemCompanyService: { getCompanyIdForUser: jest.Mock };

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-456';
  const mockInvoiceId = 'invoice-789';
  const mockClientId = 'client-101';

  let dataSource: { transaction: jest.Mock };
  let httpClient: { request: jest.Mock };

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: mockUserId,
      email: 'test@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: UserRole.COMPANY_OWNER,
      companyId: mockCompanyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  const createMockCompany = (): Company =>
    ({
      id: mockCompanyId,
      name: 'Test Company Sp. z o.o.',
      nip: '1234567890',
      street: 'ul. Testowa',
      buildingNumber: '1',
      city: 'Warszawa',
      postalCode: '00-001',
    }) as Company;

  const createMockClient = (): Client =>
    ({
      id: mockClientId,
      companyId: mockCompanyId,
      name: 'Test Client Sp. z o.o.',
      nip: '0987654321',
    }) as Client;

  const createMockInvoice = (overrides: Partial<KsefInvoice> = {}): KsefInvoice =>
    ({
      id: mockInvoiceId,
      companyId: mockCompanyId,
      invoiceType: KsefInvoiceType.SALES,
      direction: KsefInvoiceDirection.OUTGOING,
      invoiceNumber: 'FV/2026/04/0001',
      status: KsefInvoiceStatus.DRAFT,
      issueDate: new Date('2026-04-10'),
      sellerNip: '1234567890',
      sellerName: 'Test Company Sp. z o.o.',
      buyerNip: '0987654321',
      buyerName: 'Test Client Sp. z o.o.',
      netAmount: 1000,
      vatAmount: 230,
      grossAmount: 1230,
      currency: 'PLN',
      lineItems: [
        {
          description: 'Usługa testowa',
          quantity: 1,
          unit: 'szt.',
          unitNetPrice: 1000,
          netAmount: 1000,
          vatRate: 23,
          vatAmount: 230,
          grossAmount: 1230,
        },
      ],
      createdById: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as KsefInvoice;

  beforeEach(async () => {
    const mockSystemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(mockCompanyId),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefInvoiceService,
        KsefHttpClientService,
        {
          provide: getRepositoryToken(KsefInvoice),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Client),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Company),
          useValue: { findOne: jest.fn() },
        },
        { provide: KsefXmlService, useValue: { generateInvoiceXml: jest.fn().mockReturnValue('<Faktura>test</Faktura>') } },
        { provide: KsefCryptoService, useValue: { computeSha256: jest.fn().mockReturnValue('sha256hash123'), encryptInvoiceXml: jest.fn() } },
        { provide: KsefSessionService, useValue: { getOrCreateSession: jest.fn(), sendInvoiceInSession: jest.fn() } },
        { provide: KsefConfigService, useValue: { getConfigOrFail: jest.fn().mockResolvedValue({ environment: 'TEST' }) } },
        { provide: KsefAuditLogService, useValue: { log: jest.fn() } },
        { provide: KsefAuthService, useValue: { getValidToken: jest.fn().mockResolvedValue('mock-token') } },
        { provide: getRepositoryToken(KsefConfiguration), useValue: { findOne: jest.fn() } },
        { provide: EncryptionService, useValue: { decrypt: jest.fn() } },
        { provide: SystemCompanyService, useValue: mockSystemCompanyService },
        {
          provide: KsefInvoiceValidationService,
          useValue: {
            validate: jest.fn().mockReturnValue({ valid: true, issues: [] }),
            validateXml: jest.fn().mockReturnValue({ valid: true, issues: [] }),
          },
        },
        { provide: DataSource, useValue: {
          transaction: jest.fn((cb) => {
            const mockManager = {
              query: jest.fn(),
              createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
              }),
            };
            return cb(mockManager);
          }),
        } },
      ],
    }).compile();

    service = module.get(KsefInvoiceService);
    invoiceRepo = module.get(getRepositoryToken(KsefInvoice));
    clientRepo = module.get(getRepositoryToken(Client));
    companyRepo = module.get(getRepositoryToken(Company));
    systemCompanyService = module.get(SystemCompanyService);
    dataSource = module.get(DataSource);
    httpClient = module.get(KsefHttpClientService);
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      const mockInvoice = createMockInvoice();
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);

      const result = await service.findOne(mockInvoiceId, createMockUser());

      expect(result.id).toBe(mockInvoiceId);
      expect(result.invoiceNumber).toBe('FV/2026/04/0001');
      expect(result.status).toBe(KsefInvoiceStatus.DRAFT);
    });

    it('should throw KsefInvoiceNotFoundException when invoice not found', async () => {
      invoiceRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('nonexistent', createMockUser())).rejects.toThrow(
        KsefInvoiceNotFoundException,
      );
    });
  });

  describe('createDraft', () => {
    it('should create a draft invoice with clientId', async () => {
      const mockInvoice = createMockInvoice();
      const mockClient = createMockClient();
      const mockCompany = createMockCompany();

      // Mock for company lookup
      companyRepo.findOne = jest.fn().mockResolvedValue(mockCompany);
      // Mock for client lookup
      (clientRepo.findOne as jest.Mock).mockResolvedValue(mockClient);
      // Mock for getNextInvoiceNumber queryBuilder
      const numberQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (invoiceRepo.createQueryBuilder as jest.Mock).mockReturnValue(numberQb);
      (invoiceRepo.create as jest.Mock).mockReturnValue(mockInvoice);
      (invoiceRepo.save as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.createDraft(
        {
          invoiceType: KsefInvoiceType.SALES,
          issueDate: '2026-04-10',
          clientId: mockClientId,
          lineItems: [
            {
              description: 'Usługa testowa',
              quantity: 1,
              unitNetPrice: 1000,
              netAmount: 1000,
              vatRate: 23,
              vatAmount: 230,
              grossAmount: 1230,
            },
          ],
        },
        createMockUser(),
      );

      expect(result).toBeDefined();
      expect(invoiceRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when company has no NIP', async () => {
      companyRepo.findOne = jest.fn().mockResolvedValue({
        ...createMockCompany(),
        nip: null,
      });

      await expect(
        service.createDraft(
          {
            invoiceType: KsefInvoiceType.SALES,
            issueDate: '2026-04-10',
            buyerData: { name: 'Buyer' },
            lineItems: [
              {
                description: 'Test',
                quantity: 1,
                unitNetPrice: 100,
                netAmount: 100,
                vatRate: 23,
                vatAmount: 23,
                grossAmount: 123,
              },
            ],
          },
          createMockUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when neither clientId nor buyerData provided', async () => {
      companyRepo.findOne = jest.fn().mockResolvedValue(createMockCompany());

      await expect(
        service.createDraft(
          {
            invoiceType: KsefInvoiceType.SALES,
            issueDate: '2026-04-10',
            lineItems: [
              {
                description: 'Test',
                quantity: 1,
                unitNetPrice: 100,
                netAmount: 100,
                vatRate: 23,
                vatAmount: 23,
                grossAmount: 123,
              },
            ],
          },
          createMockUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate totals from line items correctly', async () => {
      const mockCompany = createMockCompany();
      const mockInvoice = createMockInvoice();
      companyRepo.findOne = jest.fn().mockResolvedValue(mockCompany);
      // Mock for getNextInvoiceNumber queryBuilder
      const numberQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (invoiceRepo.createQueryBuilder as jest.Mock).mockReturnValue(numberQb);
      (invoiceRepo.create as jest.Mock).mockReturnValue(mockInvoice);
      (invoiceRepo.save as jest.Mock).mockImplementation(async (inv) => inv);

      const dto = {
        invoiceType: KsefInvoiceType.SALES,
        issueDate: '2026-04-10',
        buyerData: { name: 'Buyer Test' },
        lineItems: [
          {
            description: 'Item 1',
            quantity: 2,
            unitNetPrice: 100,
            netAmount: 200,
            vatRate: 23,
            vatAmount: 46,
            grossAmount: 246,
          },
          {
            description: 'Item 2',
            quantity: 1,
            unitNetPrice: 500,
            netAmount: 500,
            vatRate: 23,
            vatAmount: 115,
            grossAmount: 615,
          },
        ],
      };

      await service.createDraft(dto, createMockUser());

      const createCall = (invoiceRepo.create as jest.Mock).mock.calls[0][0] as KsefInvoice;
      expect(createCall.netAmount).toBe(700);
      expect(createCall.vatAmount).toBe(161);
      expect(createCall.grossAmount).toBe(861);
    });
  });

  describe('updateDraft', () => {
    it('should update a draft invoice', async () => {
      const mockInvoice = createMockInvoice();
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);
      (invoiceRepo.save as jest.Mock).mockImplementation(async (inv) => inv);

      const result = await service.updateDraft(
        mockInvoiceId,
        { notes: 'Updated notes' },
        createMockUser(),
      );

      expect(invoiceRepo.save).toHaveBeenCalled();
    });

    it('should throw KsefInvoiceNotDraftException for non-draft invoice', async () => {
      const submittedInvoice = createMockInvoice({
        status: KsefInvoiceStatus.SUBMITTED,
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(submittedInvoice);

      await expect(
        service.updateDraft(mockInvoiceId, { notes: 'test' }, createMockUser()),
      ).rejects.toThrow(KsefInvoiceNotDraftException);
    });

    it('should throw KsefInvoiceNotFoundException when invoice not found', async () => {
      invoiceRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateDraft('nonexistent', { notes: 'test' }, createMockUser()),
      ).rejects.toThrow(KsefInvoiceNotFoundException);
    });

    it('should clear xmlContent and xmlHash when line items change', async () => {
      const mockInvoice = createMockInvoice({
        xmlContent: '<old>xml</old>',
        xmlHash: 'oldhash',
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);
      (invoiceRepo.save as jest.Mock).mockImplementation(async (inv) => inv);

      await service.updateDraft(
        mockInvoiceId,
        {
          lineItems: [
            {
              description: 'New item',
              quantity: 1,
              unitNetPrice: 100,
              netAmount: 100,
              vatRate: 23,
              vatAmount: 23,
              grossAmount: 123,
            },
          ],
        },
        createMockUser(),
      );

      const savedInvoice = (invoiceRepo.save as jest.Mock).mock.calls[0][0] as KsefInvoice;
      expect(savedInvoice.xmlContent).toBeNull();
      expect(savedInvoice.xmlHash).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    it('should delete a draft invoice', async () => {
      const mockInvoice = createMockInvoice();
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);
      (invoiceRepo.remove as jest.Mock).mockResolvedValue(mockInvoice);

      await service.deleteDraft(mockInvoiceId, createMockUser());

      expect(invoiceRepo.remove).toHaveBeenCalledWith(mockInvoice);
    });

    it('should throw KsefInvoiceNotDraftException for non-draft', async () => {
      const acceptedInvoice = createMockInvoice({
        status: KsefInvoiceStatus.ACCEPTED,
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(acceptedInvoice);

      await expect(
        service.deleteDraft(mockInvoiceId, createMockUser()),
      ).rejects.toThrow(KsefInvoiceNotDraftException);
    });
  });

  describe('getNextInvoiceNumber', () => {
    it('should generate sequential invoice number', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          query: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
              invoiceNumber: 'FV/2026/04/0003',
            }),
          }),
        };
        return cb(mockManager);
      });

      const result = await service.getNextInvoiceNumber(
        mockCompanyId,
        KsefInvoiceType.SALES,
      );

      expect(result).toMatch(/^FV\/\d{4}\/04\/0004$/);
    });

    it('should start from 0001 when no previous invoices', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          query: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          }),
        };
        return cb(mockManager);
      });

      const result = await service.getNextInvoiceNumber(
        mockCompanyId,
        KsefInvoiceType.SALES,
      );

      expect(result).toMatch(/^FV\/\d{4}\/\d{2}\/0001$/);
    });

    it('should use FK prefix for correction invoices', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          query: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          }),
        };
        return cb(mockManager);
      });

      const result = await service.getNextInvoiceNumber(
        mockCompanyId,
        KsefInvoiceType.CORRECTION,
      );

      expect(result).toMatch(/^FK\/\d{4}\/\d{2}\/0001$/);
    });
  });

  describe('getInvoiceStatus', () => {
    it('should return invoice status DTO', async () => {
      const mockInvoice = createMockInvoice({
        status: KsefInvoiceStatus.SUBMITTED,
        submittedAt: new Date('2026-04-10T10:00:00Z'),
        ksefNumber: null,
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceStatus(mockInvoiceId, createMockUser());

      expect(result.id).toBe(mockInvoiceId);
      expect(result.status).toBe(KsefInvoiceStatus.SUBMITTED);
      expect(result.submittedAt).toBe('2026-04-10T10:00:00.000Z');
    });

    it('should throw when invoice not found', async () => {
      invoiceRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.getInvoiceStatus('nonexistent', createMockUser()),
      ).rejects.toThrow(KsefInvoiceNotFoundException);
    });
  });

  describe('validateXmlWithKsef', () => {
    it('should validate invoice XML via KSeF API and return valid result', async () => {
      const mockInvoice = createMockInvoice({
        xmlContent: '<Faktura>test</Faktura>',
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);

      const mockHttpClient = httpClient;
      mockHttpClient.request = jest.fn().mockResolvedValue({
        data: {
          valid: true,
          invoiceVersion: 'v3',
          canonicalForm: 'base64canonical==',
        },
        status: 200,
        headers: {},
      });

      const result = await service.validateXmlWithKsef(mockInvoiceId, createMockUser());

      expect(result.valid).toBe(true);
      expect(result.invoiceVersion).toBe('v3');
      expect(result.canonicalForm).toBe('base64canonical==');
      expect(result.error).toBeUndefined();
    });

    it('should return error when XML is invalid', async () => {
      const mockInvoice = createMockInvoice({
        xmlContent: '<invalid>xml</invalid>',
      });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);

      const mockHttpClient = httpClient;
      mockHttpClient.request = jest.fn().mockResolvedValue({
        data: {
          valid: false,
          invoiceVersion: 'v3',
          error: {
            code: '1203',
            description: 'Faktura ma nieprawidłowy format',
            details: 'Missing required element: P_1',
          },
        },
        status: 200,
        headers: {},
      });

      const result = await service.validateXmlWithKsef(mockInvoiceId, createMockUser());

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('1203');
      expect(result.error?.details).toContain('P_1');
    });

    it('should generate XML if not present', async () => {
      const mockInvoice = createMockInvoice({ xmlContent: null });
      invoiceRepo.findOne = jest.fn().mockResolvedValue(mockInvoice);
      invoiceRepo.save = jest.fn().mockResolvedValue({ ...mockInvoice, xmlContent: '<Faktura>test</Faktura>' });

      companyRepo.findOne = jest.fn().mockResolvedValue(createMockCompany());

      const mockHttpClient = httpClient;
      mockHttpClient.request = jest.fn().mockResolvedValue({
        data: { valid: true, invoiceVersion: 'v3' },
        status: 200,
        headers: {},
      });

      const result = await service.validateXmlWithKsef(mockInvoiceId, createMockUser());

      expect(result.valid).toBe(true);
      expect(invoiceRepo.save).toHaveBeenCalled();
    });

    it('should throw when invoice not found', async () => {
      invoiceRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.validateXmlWithKsef('nonexistent', createMockUser()),
      ).rejects.toThrow(KsefInvoiceNotFoundException);
    });
  });
});
