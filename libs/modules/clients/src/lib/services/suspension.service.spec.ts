import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type EntityManager, type QueryRunner, type Repository } from 'typeorm';

import {
  Client,
  ClientSuspension,
  EmploymentType,
  TaxScheme,
  User,
  UserRole,
  VatStatus,
  ZusStatus,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { ClientNotFoundException } from '../exceptions';
import { SuspensionService } from './suspension.service';

describe('SuspensionService', () => {
  let service: SuspensionService;
  let suspensionRepository: jest.Mocked<Repository<ClientSuspension>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let tenantService: jest.Mocked<TenantService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockUserId = 'user-789';
  const mockSuspensionId = 'suspension-abc';

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: mockUserId,
      email: 'test@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: UserRole.EMPLOYEE,
      companyId: mockCompanyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  const createMockClient = (overrides: Partial<Client> = {}): Client =>
    ({
      id: mockClientId,
      companyId: mockCompanyId,
      name: 'Test Client Sp. z o.o.',
      nip: '1234567890',
      email: 'client@example.com',
      employmentType: EmploymentType.DG,
      vatStatus: VatStatus.VAT_MONTHLY,
      taxScheme: TaxScheme.GENERAL,
      zusStatus: ZusStatus.FULL,
      isActive: true,
      receiveEmailCopy: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Client;

  const createMockSuspension = (overrides: Partial<ClientSuspension> = {}): ClientSuspension =>
    ({
      id: mockSuspensionId,
      clientId: mockClientId,
      companyId: mockCompanyId,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-01'),
      reason: 'Zawieszenie na czas remontu',
      createdById: mockUserId,
      startDate7DayReminderSent: false,
      startDate1DayReminderSent: false,
      endDate7DayReminderSent: false,
      endDate1DayReminderSent: false,
      resumptionNotificationSent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ClientSuspension;

  const createMockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
  };

  beforeEach(async () => {
    // Create mock entity manager with query builder support
    entityManager = {
      save: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    // Create mock query runner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: entityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    // Create mock data source
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    const mockSuspensionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockClientRepo = {
      findOne: jest.fn(),
    };

    const mockUserRepo = {
      find: jest.fn(),
    };

    const mockTenantService = {
      getEffectiveCompanyId: jest.fn().mockResolvedValue(mockCompanyId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SuspensionService,
          useFactory: () =>
            new SuspensionService(
              mockSuspensionRepo as any,
              mockClientRepo as any,
              mockUserRepo as any,
              mockTenantService as any,
              dataSource as any
            ),
        },
        { provide: getRepositoryToken(ClientSuspension), useValue: mockSuspensionRepo },
        { provide: getRepositoryToken(Client), useValue: mockClientRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: TenantService, useValue: mockTenantService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SuspensionService);
    suspensionRepository = module.get(getRepositoryToken(ClientSuspension));
    clientRepository = module.get(getRepositoryToken(Client));
    userRepository = module.get(getRepositoryToken(User));
    tenantService = module.get(TenantService);

    jest.clearAllMocks();
    // Re-set default after clearAllMocks
    tenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================
  // create
  // ============================

  describe('create', () => {
    it('should create a suspension within a transaction', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01', endDate: '2026-07-01', reason: 'Remont' };
      const savedSuspension = createMockSuspension({
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-07-01'),
        reason: 'Remont',
      });

      clientRepository.findOne.mockResolvedValue(client);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.create.mockReturnValue(savedSuspension);
      entityManager.save.mockResolvedValue(savedSuspension);

      const result = await service.create(mockClientId, dto as any, user);

      expect(result).toBeDefined();
      expect(result.clientId).toBe(mockClientId);
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw ClientNotFoundException when client does not exist', async () => {
      const user = createMockUser();
      const dto = { startDate: '2026-04-01' };

      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockClientId, dto as any, user)).rejects.toThrow(
        ClientNotFoundException
      );
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-07-01', endDate: '2026-04-01' };

      clientRepository.findOne.mockResolvedValue(client);

      await expect(service.create(mockClientId, dto as any, user)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when endDate equals startDate', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01', endDate: '2026-04-01' };

      clientRepository.findOne.mockResolvedValue(client);

      await expect(service.create(mockClientId, dto as any, user)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow creating suspension without endDate (unbounded)', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01', reason: 'Bezterminowe zawieszenie' };
      const saved = createMockSuspension({ endDate: undefined });

      clientRepository.findOne.mockResolvedValue(client);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.create.mockReturnValue(saved);
      entityManager.save.mockResolvedValue(saved);

      const result = await service.create(mockClientId, dto as any, user);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when overlapping suspension exists', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01', endDate: '2026-06-01' };
      const existingSuspension = createMockSuspension({
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-05-01'),
      });

      clientRepository.findOne.mockResolvedValue(client);
      const managerQb = createMockQueryBuilder();
      managerQb.getMany.mockResolvedValue([existingSuspension]);
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);

      await expect(service.create(mockClientId, dto as any, user)).rejects.toThrow(
        BadRequestException
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01' };

      clientRepository.findOne.mockResolvedValue(client);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.create.mockReturnValue(createMockSuspension());
      entityManager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.create(mockClientId, dto as any, user)).rejects.toThrow('DB error');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should use tenant service to resolve companyId', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const dto = { startDate: '2026-04-01' };
      const saved = createMockSuspension();

      clientRepository.findOne.mockResolvedValue(client);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.create.mockReturnValue(saved);
      entityManager.save.mockResolvedValue(saved);

      await service.create(mockClientId, dto as any, user);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(user);
    });
  });

  // ============================
  // update
  // ============================

  describe('update', () => {
    it('should update suspension endDate', async () => {
      const user = createMockUser();
      const existingSuspension = createMockSuspension({
        client: createMockClient() as any,
      });
      const dto = { endDate: '2026-08-01' };

      entityManager.findOne.mockResolvedValue(existingSuspension);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.save.mockResolvedValue({
        ...existingSuspension,
        endDate: new Date('2026-08-01'),
      });

      const result = await service.update(mockClientId, mockSuspensionId, dto as any, user);

      expect(result).toBeDefined();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when suspension does not exist', async () => {
      const user = createMockUser();
      const dto = { endDate: '2026-08-01' };

      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockClientId, mockSuspensionId, dto as any, user)
      ).rejects.toThrow(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when new endDate is before startDate', async () => {
      const user = createMockUser();
      const existingSuspension = createMockSuspension({
        startDate: new Date('2026-06-01'),
      });
      const dto = { endDate: '2026-04-01' };

      entityManager.findOne.mockResolvedValue(existingSuspension);

      await expect(
        service.update(mockClientId, mockSuspensionId, dto as any, user)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset notification flags when endDate changes', async () => {
      const user = createMockUser();
      const existingSuspension = createMockSuspension({
        client: createMockClient() as any,
        endDate7DayReminderSent: true,
        endDate1DayReminderSent: true,
        resumptionNotificationSent: true,
      });
      const dto = { endDate: '2026-09-01' };

      entityManager.findOne.mockResolvedValue(existingSuspension);
      const managerQb = createMockQueryBuilder();
      entityManager.createQueryBuilder.mockReturnValue(managerQb as any);
      entityManager.save.mockImplementation(async (entity: any) => entity);

      await service.update(mockClientId, mockSuspensionId, dto as any, user);

      expect(entityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          endDate7DayReminderSent: false,
          endDate1DayReminderSent: false,
          resumptionNotificationSent: false,
        })
      );
    });

    it('should update reason without checking overlap', async () => {
      const user = createMockUser();
      const existingSuspension = createMockSuspension({
        client: createMockClient() as any,
      });
      const dto = { reason: 'Updated reason' };

      entityManager.findOne.mockResolvedValue(existingSuspension);
      entityManager.save.mockImplementation(async (entity: any) => entity);

      const result = await service.update(mockClientId, mockSuspensionId, dto as any, user);

      expect(result).toBeDefined();
      // createQueryBuilder should NOT be called since endDate is not changing
      expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ============================
  // remove
  // ============================

  describe('remove', () => {
    it('should delete a suspension', async () => {
      const user = createMockUser();
      const suspension = createMockSuspension();

      suspensionRepository.findOne.mockResolvedValue(suspension);
      suspensionRepository.remove.mockResolvedValue(suspension);

      await service.remove(mockClientId, mockSuspensionId, user);

      expect(suspensionRepository.remove).toHaveBeenCalledWith(suspension);
    });

    it('should throw NotFoundException when suspension does not exist', async () => {
      const user = createMockUser();

      suspensionRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockClientId, mockSuspensionId, user)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should enforce tenant isolation via companyId filter', async () => {
      const user = createMockUser();

      suspensionRepository.findOne.mockResolvedValue(null);

      try {
        await service.remove(mockClientId, mockSuspensionId, user);
      } catch {
        // expected
      }

      expect(suspensionRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSuspensionId, clientId: mockClientId, companyId: mockCompanyId },
      });
    });
  });

  // ============================
  // findAll
  // ============================

  describe('findAll', () => {
    it('should return all suspensions for a client ordered by startDate DESC', async () => {
      const user = createMockUser();
      const client = createMockClient();
      const suspensions = [
        createMockSuspension({ id: 's1', startDate: new Date('2026-06-01') }),
        createMockSuspension({ id: 's2', startDate: new Date('2026-03-01') }),
      ];

      clientRepository.findOne.mockResolvedValue(client);
      suspensionRepository.find.mockResolvedValue(suspensions);

      const result = await service.findAll(mockClientId, user);

      expect(result).toHaveLength(2);
      expect(suspensionRepository.find).toHaveBeenCalledWith({
        where: { clientId: mockClientId, companyId: mockCompanyId },
        relations: ['createdBy'],
        order: { startDate: 'DESC' },
      });
    });

    it('should throw ClientNotFoundException when client does not exist', async () => {
      const user = createMockUser();

      clientRepository.findOne.mockResolvedValue(null);

      await expect(service.findAll(mockClientId, user)).rejects.toThrow(ClientNotFoundException);
    });
  });

  // ============================
  // findOne
  // ============================

  describe('findOne', () => {
    it('should return a specific suspension', async () => {
      const user = createMockUser();
      const suspension = createMockSuspension({
        client: createMockClient() as any,
        createdBy: createMockUser() as any,
      });

      suspensionRepository.findOne.mockResolvedValue(suspension);

      const result = await service.findOne(mockClientId, mockSuspensionId, user);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSuspensionId);
    });

    it('should throw NotFoundException when suspension not found', async () => {
      const user = createMockUser();

      suspensionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockClientId, mockSuspensionId, user)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // ============================
  // isClientSuspended / getCurrentSuspension
  // ============================

  describe('isClientSuspended', () => {
    it('should return true when active suspension exists', async () => {
      const activeSuspension = createMockSuspension();
      suspensionRepository.findOne.mockResolvedValue(activeSuspension);

      const result = await service.isClientSuspended(mockClientId, mockCompanyId);

      expect(result).toBe(true);
    });

    it('should return false when no active suspension', async () => {
      suspensionRepository.findOne.mockResolvedValue(null);

      const result = await service.isClientSuspended(mockClientId, mockCompanyId);

      expect(result).toBe(false);
    });
  });

  // ============================
  // getCompanyEmployees / getCompanyOwners
  // ============================

  describe('getCompanyEmployees', () => {
    it('should return active non-admin users', async () => {
      const employees = [createMockUser({ role: UserRole.EMPLOYEE })];
      userRepository.find.mockResolvedValue(employees);

      const result = await service.getCompanyEmployees(mockCompanyId);

      expect(result).toEqual(employees);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isActive: true,
          role: expect.anything(), // Not(UserRole.ADMIN)
        },
      });
    });
  });

  describe('getCompanyOwners', () => {
    it('should return active company owners', async () => {
      const owners = [createMockUser({ role: UserRole.COMPANY_OWNER })];
      userRepository.find.mockResolvedValue(owners);

      const result = await service.getCompanyOwners(mockCompanyId);

      expect(result).toEqual(owners);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          isActive: true,
          role: UserRole.COMPANY_OWNER,
        },
      });
    });
  });

  // ============================
  // Reminder queries
  // ============================

  describe('reminder queries', () => {
    it('getSuspensionsFor7DayStartReminder should query with correct filter', async () => {
      suspensionRepository.find.mockResolvedValue([]);

      await service.getSuspensionsFor7DayStartReminder();

      expect(suspensionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate7DayReminderSent: false,
          }),
          relations: ['client'],
          order: { companyId: 'ASC', startDate: 'ASC' },
        })
      );
    });

    it('getSuspensionsFor1DayStartReminder should query with correct filter', async () => {
      suspensionRepository.find.mockResolvedValue([]);

      await service.getSuspensionsFor1DayStartReminder();

      expect(suspensionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate1DayReminderSent: false,
          }),
          relations: ['client'],
        })
      );
    });

    it('getSuspensionsFor7DayEndReminder should query with correct filter', async () => {
      suspensionRepository.find.mockResolvedValue([]);

      await service.getSuspensionsFor7DayEndReminder();

      expect(suspensionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endDate7DayReminderSent: false,
          }),
          relations: ['client'],
          order: { companyId: 'ASC', endDate: 'ASC' },
        })
      );
    });

    it('getSuspensionsFor1DayEndReminder should query with correct filter', async () => {
      suspensionRepository.find.mockResolvedValue([]);

      await service.getSuspensionsFor1DayEndReminder();

      expect(suspensionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endDate1DayReminderSent: false,
          }),
          relations: ['client'],
        })
      );
    });

    it('getSuspensionsForResumptionNotification should query with correct filter', async () => {
      suspensionRepository.find.mockResolvedValue([]);

      await service.getSuspensionsForResumptionNotification();

      expect(suspensionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resumptionNotificationSent: false,
          }),
          relations: ['client'],
          order: { companyId: 'ASC', endDate: 'ASC' },
        })
      );
    });
  });

  // ============================
  // markReminderSent
  // ============================

  describe('markReminderSent', () => {
    it('should update the correct reminder flag', async () => {
      suspensionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markReminderSent(mockSuspensionId, 'startDate7DayReminderSent');

      expect(suspensionRepository.update).toHaveBeenCalledWith(mockSuspensionId, {
        startDate7DayReminderSent: true,
      });
    });

    it('should support all reminder types', async () => {
      suspensionRepository.update.mockResolvedValue({ affected: 1 } as any);

      const reminderTypes = [
        'startDate7DayReminderSent',
        'startDate1DayReminderSent',
        'endDate7DayReminderSent',
        'endDate1DayReminderSent',
        'resumptionNotificationSent',
      ] as const;

      for (const type of reminderTypes) {
        await service.markReminderSent(mockSuspensionId, type);
        expect(suspensionRepository.update).toHaveBeenCalledWith(mockSuspensionId, {
          [type]: true,
        });
      }
    });
  });
});
