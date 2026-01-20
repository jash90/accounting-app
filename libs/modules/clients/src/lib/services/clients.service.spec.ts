import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientsService, CreateClientDto, UpdateClientDto, ClientFilters } from './clients.service';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { ClientChangelogService } from './client-changelog.service';
import { AutoAssignService } from './auto-assign.service';
import {
  Client,
  User,
  UserRole,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  AmlGroup,
  PaginatedResponseDto,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ClientNotFoundException } from '../exceptions';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let changeLogService: jest.Mocked<ChangeLogService>;
  let clientChangelogService: jest.Mocked<ClientChangelogService>;
  let autoAssignService: jest.Mocked<AutoAssignService>;
  let tenantService: jest.Mocked<TenantService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'bartlomiej.zimny@onet.pl',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockClient: Partial<Client> = {
    id: 'client-123',
    name: 'Test Client',
    nip: '1234567890',
    email: 'client@test.com',
    phone: '+48123456789',
    companyId: mockCompanyId,
    createdById: mockUserId,
    isActive: true,
    employmentType: EmploymentType.DG,
    vatStatus: VatStatus.VAT_MONTHLY,
    taxScheme: TaxScheme.GENERAL,
    zusStatus: ZusStatus.FULL,
    amlGroupEnum: AmlGroup.LOW,
    receiveEmailCopy: true,
    gtuCodes: ['GTU_01', 'GTU_02'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockClient], 1]),
  });

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: ChangeLogService,
          useValue: {
            logCreate: jest.fn(),
            logUpdate: jest.fn(),
            logDelete: jest.fn(),
          },
        },
        {
          provide: ClientChangelogService,
          useValue: {
            notifyClientCreated: jest.fn(),
            notifyClientUpdated: jest.fn(),
            notifyClientDeleted: jest.fn(),
          },
        },
        {
          provide: AutoAssignService,
          useValue: {
            evaluateAndAssign: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            getEffectiveCompanyId: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientRepository = module.get(getRepositoryToken(Client));
    changeLogService = module.get(ChangeLogService);
    clientChangelogService = module.get(ClientChangelogService);
    autoAssignService = module.get(AutoAssignService);
    tenantService = module.get(TenantService);
  });

  describe('findAll', () => {
    it('should return paginated clients for company', async () => {
      const result = await service.findAll(mockUser as User);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should apply search filter with LIKE escaping', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { search: 'Test%Client' };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%Test\\%Client%' }),
      );
    });

    it('should apply search filter with underscore escaping', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { search: 'Test_Client' };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%Test\\_Client%' }),
      );
    });

    it('should apply employment type filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { employmentType: EmploymentType.DG };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.employmentType = :employmentType',
        { employmentType: EmploymentType.DG },
      );
    });

    it('should apply VAT status filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { vatStatus: VatStatus.VAT_MONTHLY };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.vatStatus = :vatStatus',
        { vatStatus: VatStatus.VAT_MONTHLY },
      );
    });

    it('should apply tax scheme filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { taxScheme: TaxScheme.GENERAL };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.taxScheme = :taxScheme',
        { taxScheme: TaxScheme.GENERAL },
      );
    });

    it('should apply ZUS status filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { zusStatus: ZusStatus.FULL };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.zusStatus = :zusStatus',
        { zusStatus: ZusStatus.FULL },
      );
    });

    it('should apply AML group filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { amlGroupEnum: AmlGroup.HIGH };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.amlGroupEnum = :amlGroupEnum',
        { amlGroupEnum: AmlGroup.HIGH },
      );
    });

    it('should apply GTU code filter using ANY', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { gtuCode: 'GTU_01' };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        ':gtuCode = ANY(client.gtuCodes)',
        { gtuCode: 'GTU_01' },
      );
    });

    it('should apply PKD code filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { pkdCode: '62.01' };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.pkdCode = :pkdCode',
        { pkdCode: '62.01' },
      );
    });

    it('should apply PKD code filter with subsection', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { pkdCode: '62.01.Z' };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.pkdCode = :pkdCode',
        { pkdCode: '62.01.Z' },
      );
    });

    it('should apply receiveEmailCopy filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { receiveEmailCopy: true };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.receiveEmailCopy = :receiveEmailCopy',
        { receiveEmailCopy: true },
      );
    });

    it('should apply isActive filter', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { isActive: false };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'client.isActive = :isActive',
        { isActive: false },
      );
    });

    it('should apply pagination correctly', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = { page: 3, limit: 10 };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should use default pagination values', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (1-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should order results by name ascending', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('client.name', 'ASC');
    });

    it('should apply multiple filters together', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      const filters: ClientFilters = {
        search: 'Test',
        employmentType: EmploymentType.DG,
        vatStatus: VatStatus.VAT_MONTHLY,
        isActive: true,
      };
      await service.findAll(mockUser as User, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });
  });

  describe('findOne', () => {
    it('should return client when found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(mockClient);

      const result = await service.findOne('client-123', mockUser as User);

      expect(result).toEqual(mockClient);
      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-123', companyId: mockCompanyId },
        relations: expect.arrayContaining([
          'iconAssignments',
          'iconAssignments.icon',
          'customFieldValues',
          'customFieldValues.fieldDefinition',
        ]),
      });
    });

    it('should throw ClientNotFoundException when not found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser as User)).rejects.toThrow(
        ClientNotFoundException,
      );
    });

    it('should use tenant service for company isolation', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(mockClient);

      await service.findOne('client-123', mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('create', () => {
    const createDto: CreateClientDto = {
      name: 'New Client',
      nip: '9876543210',
      email: 'new@client.com',
      employmentType: EmploymentType.DG,
    };

    it('should create client with company and user context', async () => {
      const savedClient = { ...mockClient, ...createDto };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      const result = await service.create(createDto, mockUser as User);

      expect(clientRepository.create).toHaveBeenCalledWith({
        ...createDto,
        companyId: mockCompanyId,
        createdById: mockUserId,
      });
      expect(clientRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedClient);
    });

    it('should trigger auto-assign after creation', async () => {
      const savedClient = { ...mockClient, ...createDto };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      await service.create(createDto, mockUser as User);

      expect(autoAssignService.evaluateAndAssign).toHaveBeenCalledWith(savedClient);
    });

    it('should log creation to changelog', async () => {
      const savedClient = { ...mockClient, ...createDto };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      await service.create(createDto, mockUser as User);

      expect(changeLogService.logCreate).toHaveBeenCalledWith(
        'Client',
        savedClient.id,
        expect.any(Object),
        mockUser,
      );
    });

    it('should send notification after creation', async () => {
      const savedClient = { ...mockClient, ...createDto };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      await service.create(createDto, mockUser as User);

      expect(clientChangelogService.notifyClientCreated).toHaveBeenCalledWith(
        savedClient,
        mockUser,
      );
    });

    it('should not fail if auto-assign throws error', async () => {
      const savedClient = { ...mockClient, ...createDto };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);
      autoAssignService.evaluateAndAssign = jest.fn().mockRejectedValue(new Error('Auto-assign failed'));

      const result = await service.create(createDto, mockUser as User);

      expect(result).toEqual(savedClient);
    });

    it('should create client with valid PKD code', async () => {
      const dtoWithPkd: CreateClientDto = {
        ...createDto,
        pkdCode: '62.01',
      };
      const savedClient = { ...mockClient, ...dtoWithPkd };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      const result = await service.create(dtoWithPkd, mockUser as User);

      expect(result.pkdCode).toBe('62.01');
      expect(clientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ pkdCode: '62.01' }),
      );
    });

    it('should create client with PKD code including subsection', async () => {
      const dtoWithPkd: CreateClientDto = {
        ...createDto,
        pkdCode: '62.01.Z',
      };
      const savedClient = { ...mockClient, ...dtoWithPkd };
      clientRepository.create = jest.fn().mockReturnValue(savedClient);
      clientRepository.save = jest.fn().mockResolvedValue(savedClient);

      const result = await service.create(dtoWithPkd, mockUser as User);

      expect(result.pkdCode).toBe('62.01.Z');
    });

    it('should reject invalid PKD code format', async () => {
      const dtoWithInvalidPkd: CreateClientDto = {
        ...createDto,
        pkdCode: 'INVALID',
      };

      await expect(service.create(dtoWithInvalidPkd, mockUser as User)).rejects.toThrow(
        'Nieprawidłowy kod PKD',
      );
    });

    it('should reject PKD code not in registry', async () => {
      const dtoWithInvalidPkd: CreateClientDto = {
        ...createDto,
        pkdCode: '99.99', // Valid format but doesn't exist
      };

      await expect(service.create(dtoWithInvalidPkd, mockUser as User)).rejects.toThrow(
        'Nieprawidłowy kod PKD',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateClientDto = {
      name: 'Updated Client',
      email: 'updated@client.com',
    };

    it('should update client and set updatedById', async () => {
      const existingClient = { ...mockClient };
      const updatedClient = { ...existingClient, ...updateDto, updatedById: mockUserId };

      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue(updatedClient);

      const result = await service.update('client-123', updateDto, mockUser as User);

      expect(clientRepository.save).toHaveBeenCalled();
      expect(result.updatedById).toBe(mockUserId);
    });

    it('should trigger auto-assign after update', async () => {
      const existingClient = { ...mockClient };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...existingClient, ...updateDto });

      await service.update('client-123', updateDto, mockUser as User);

      expect(autoAssignService.evaluateAndAssign).toHaveBeenCalled();
    });

    it('should log update with old and new values', async () => {
      const existingClient = { ...mockClient };
      const updatedClient = { ...existingClient, ...updateDto };

      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue(updatedClient);

      await service.update('client-123', updateDto, mockUser as User);

      expect(changeLogService.logUpdate).toHaveBeenCalledWith(
        'Client',
        existingClient.id,
        expect.any(Object), // old values
        expect.any(Object), // new values
        mockUser,
      );
    });

    it('should send notification after update', async () => {
      const existingClient = { ...mockClient };
      const updatedClient = { ...existingClient, ...updateDto };

      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue(updatedClient);

      await service.update('client-123', updateDto, mockUser as User);

      expect(clientChangelogService.notifyClientUpdated).toHaveBeenCalled();
    });

    it('should throw ClientNotFoundException if client not found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockUser as User),
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('should not fail if auto-assign throws error', async () => {
      const existingClient = { ...mockClient };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...existingClient, ...updateDto });
      autoAssignService.evaluateAndAssign = jest.fn().mockRejectedValue(new Error('Auto-assign failed'));

      const result = await service.update('client-123', updateDto, mockUser as User);

      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft delete client by setting isActive to false', async () => {
      const existingClient = { ...mockClient, isActive: true };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...existingClient, isActive: false });

      await service.remove('client-123', mockUser as User);

      expect(clientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, updatedById: mockUserId }),
      );
    });

    it('should log deletion to changelog', async () => {
      const existingClient = { ...mockClient };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...existingClient, isActive: false });

      await service.remove('client-123', mockUser as User);

      expect(changeLogService.logDelete).toHaveBeenCalledWith(
        'Client',
        existingClient.id,
        expect.any(Object),
        mockUser,
      );
    });

    it('should send notification after deletion', async () => {
      const existingClient = { ...mockClient };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...existingClient, isActive: false });

      await service.remove('client-123', mockUser as User);

      expect(clientChangelogService.notifyClientDeleted).toHaveBeenCalled();
    });

    it('should throw ClientNotFoundException if client not found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUser as User)).rejects.toThrow(
        ClientNotFoundException,
      );
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete client', async () => {
      const existingClient = { ...mockClient };
      clientRepository.findOne = jest.fn().mockResolvedValue(existingClient);
      clientRepository.remove = jest.fn().mockResolvedValue(existingClient);

      await service.hardDelete('client-123', mockUser as User);

      expect(clientRepository.remove).toHaveBeenCalledWith(existingClient);
    });

    it('should throw ClientNotFoundException if client not found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.hardDelete('non-existent', mockUser as User)).rejects.toThrow(
        ClientNotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted client', async () => {
      const deletedClient = { ...mockClient, isActive: false };
      clientRepository.findOne = jest.fn().mockResolvedValue(deletedClient);
      clientRepository.save = jest.fn().mockResolvedValue({ ...deletedClient, isActive: true });

      const result = await service.restore('client-123', mockUser as User);

      expect(result.isActive).toBe(true);
      expect(clientRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-123', companyId: mockCompanyId, isActive: false },
      });
    });

    it('should set updatedById on restore', async () => {
      const deletedClient = { ...mockClient, isActive: false };
      clientRepository.findOne = jest.fn().mockResolvedValue(deletedClient);
      clientRepository.save = jest.fn().mockImplementation((client) => Promise.resolve(client));

      await service.restore('client-123', mockUser as User);

      expect(clientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedById: mockUserId }),
      );
    });

    it('should throw ClientNotFoundException if deleted client not found', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.restore('non-existent', mockUser as User)).rejects.toThrow(
        ClientNotFoundException,
      );
    });
  });

  describe('SQL injection protection', () => {
    it('should escape backslash in search pattern', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { search: 'Test\\Client' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ search: '%Test\\\\Client%' }),
      );
    });

    it('should escape percent sign in search pattern', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { search: '50%' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ search: '%50\\%%' }),
      );
    });

    it('should escape underscore in search pattern', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { search: 'test_value' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ search: '%test\\_value%' }),
      );
    });

    it('should escape multiple special characters', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User, { search: '50%_test\\' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ search: '%50\\%\\_test\\\\%' }),
      );
    });
  });

  describe('Tenant isolation', () => {
    it('should always use tenant service for company context', async () => {
      clientRepository.findOne = jest.fn().mockResolvedValue(mockClient);

      await service.findOne('client-123', mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by company in findAll query', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      clientRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.findAll(mockUser as User);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'client.companyId = :companyId',
        { companyId: mockCompanyId },
      );
    });
  });
});
