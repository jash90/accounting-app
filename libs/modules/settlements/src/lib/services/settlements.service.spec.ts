import { TenantService } from '@accounting/common/backend';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';
import { InternalServerErrorException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import {
  Client,
  MonthlySettlement,
  PaginatedResponseDto,
  SettlementStatus,
  User,
  UserRole,
} from '@accounting/common';

import { SETTLEMENT_MESSAGES } from '../constants/settlement-messages';
import {
  SettlementAccessDeniedException,
  SettlementNotFoundException,
  UserNotFoundException,
} from '../exceptions';
import { SettlementsService } from './settlements.service';

describe('SettlementsService', () => {
  let service: SettlementsService;
  let settlementRepository: jest.Mocked<Repository<MonthlySettlement>>;
  let clientRepository: jest.Mocked<Repository<Client>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let tenantService: jest.Mocked<TenantService>;
  let emailSenderService: jest.Mocked<EmailSenderService>;
  let emailConfigService: jest.Mocked<EmailConfigurationService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockSettlementId = 'settlement-123';

  const mockCompanyOwner: Partial<User> = {
    id: mockUserId,
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
    firstName: 'Jan',
    lastName: 'Kowalski',
  };

  const mockEmployee: Partial<User> = {
    id: 'employee-456',
    email: 'employee@company.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
    firstName: 'Anna',
    lastName: 'Nowak',
  };

  const mockAdmin: Partial<User> = {
    id: 'admin-789',
    email: 'admin@system.com',
    role: UserRole.ADMIN,
    companyId: null,
  };

  const mockClient: Partial<Client> = {
    id: 'client-001',
    name: 'Test Client',
    nip: '1234567890',
    email: 'client@example.com',
    companyId: mockCompanyId,
    isActive: true,
  };

  const mockSettlement: Partial<MonthlySettlement> = {
    id: mockSettlementId,
    companyId: mockCompanyId,
    userId: mockUserId,
    clientId: mockClient.id,
    client: mockClient as Client,
    month: 3,
    year: 2026,
    status: SettlementStatus.PENDING,
    statusHistory: [],
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockSettlement], 1]),
    getMany: jest.fn().mockResolvedValue([mockSettlement]),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockEmailSenderService = {
    sendEmailAndSave: jest.fn(),
  };

  const mockEmailConfigService = {
    getDecryptedEmailConfigByCompanyId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const mockQb = createMockQueryBuilder();

    const mockSettlementRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const mockClientRepository = {
      find: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SettlementsService,
          useFactory: () => {
            return new SettlementsService(
              mockSettlementRepository as any,
              mockClientRepository as any,
              mockUserRepository as any,
              mockTenantService as any,
              mockEmailSenderService as any,
              mockEmailConfigService as any
            );
          },
        },
        {
          provide: getRepositoryToken(MonthlySettlement),
          useValue: mockSettlementRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: EmailSenderService,
          useValue: mockEmailSenderService,
        },
        {
          provide: EmailConfigurationService,
          useValue: mockEmailConfigService,
        },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
    settlementRepository = module.get(getRepositoryToken(MonthlySettlement));
    clientRepository = module.get(getRepositoryToken(Client));
    userRepository = module.get(getRepositoryToken(User));
    tenantService = module.get(TenantService);
    emailSenderService = module.get(EmailSenderService);
    emailConfigService = module.get(EmailConfigurationService);
  });

  describe('findAll', () => {
    const baseQuery = { month: 3, year: 2026 };

    it('should return paginated settlements for COMPANY_OWNER', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.findAll(baseQuery as any, mockCompanyOwner as User);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
      expect(mockQb.where).toHaveBeenCalledWith('settlement.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should filter by userId for EMPLOYEE role', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll(baseQuery as any, mockEmployee as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.userId = :userId', {
        userId: mockEmployee.id,
      });
    });

    it('should NOT filter by userId for COMPANY_OWNER', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll(baseQuery as any, mockCompanyOwner as User);

      // Should NOT have the userId filter
      const andWhereCalls = mockQb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContain('settlement.userId = :userId');
    });

    it('should filter by status when provided', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll(
        { ...baseQuery, status: SettlementStatus.IN_PROGRESS } as any,
        mockCompanyOwner as User
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.status = :status', {
        status: SettlementStatus.IN_PROGRESS,
      });
    });

    it('should apply ILIKE search with escaped pattern', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll({ ...baseQuery, search: '100%_test' } as any, mockCompanyOwner as User);

      // escapeLikePattern should escape % and _
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "(client.name ILIKE :search ESCAPE '\\' OR client.nip ILIKE :search ESCAPE '\\')",
        expect.objectContaining({ search: expect.stringContaining('100') })
      );
    });

    it('should filter unassigned settlements when unassigned=true', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll({ ...baseQuery, unassigned: true } as any, mockCompanyOwner as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.userId IS NULL');
    });

    it('should filter by assigneeId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll(
        { ...baseQuery, assigneeId: 'specific-user' } as any,
        mockCompanyOwner as User
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.userId = :assigneeId', {
        assigneeId: 'specific-user',
      });
    });

    it('should apply pagination with skip and take', async () => {
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll({ ...baseQuery, page: 2, limit: 10 } as any, mockCompanyOwner as User);

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return settlement for COMPANY_OWNER', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);

      const result = await service.findOne(mockSettlementId, mockCompanyOwner as User);

      expect(result).toEqual(mockSettlement);
      expect(settlementRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSettlementId, companyId: mockCompanyId },
        relations: ['client', 'assignedUser', 'assignedBy', 'settledBy'],
      });
    });

    it('should throw SettlementNotFoundException when not found', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(mockSettlementId, mockCompanyOwner as User)).rejects.toThrow(
        SettlementNotFoundException
      );
    });

    it('should throw SettlementAccessDeniedException for EMPLOYEE on other user settlement', async () => {
      const otherSettlement = { ...mockSettlement, userId: 'other-user-id' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(otherSettlement);

      await expect(service.findOne(mockSettlementId, mockEmployee as User)).rejects.toThrow(
        SettlementAccessDeniedException
      );
    });

    it('should allow EMPLOYEE to access own settlement', async () => {
      const ownSettlement = { ...mockSettlement, userId: mockEmployee.id };
      settlementRepository.findOne = jest.fn().mockResolvedValue(ownSettlement);

      const result = await service.findOne(mockSettlementId, mockEmployee as User);

      expect(result).toEqual(ownSettlement);
    });
  });

  describe('createMonthlySettlements', () => {
    const initDto = { month: 3, year: 2026 };

    it('should create settlements for active clients without existing ones', async () => {
      const clients = [
        { id: 'client-1', companyId: mockCompanyId, isActive: true },
        { id: 'client-2', companyId: mockCompanyId, isActive: true },
      ];
      clientRepository.find = jest.fn().mockResolvedValue(clients);
      settlementRepository.find = jest.fn().mockResolvedValue([]);
      settlementRepository.save = jest.fn().mockResolvedValue([]);

      const result = await service.createMonthlySettlements(
        initDto as any,
        mockCompanyOwner as User
      );

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(settlementRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            clientId: 'client-1',
            month: 3,
            year: 2026,
            status: SettlementStatus.PENDING,
            companyId: mockCompanyId,
          }),
        ])
      );
    });

    it('should skip clients with existing settlements', async () => {
      const clients = [
        { id: 'client-1', companyId: mockCompanyId, isActive: true },
        { id: 'client-2', companyId: mockCompanyId, isActive: true },
      ];
      const existingSettlements = [{ clientId: 'client-1' }];
      clientRepository.find = jest.fn().mockResolvedValue(clients);
      settlementRepository.find = jest.fn().mockResolvedValue(existingSettlements);
      settlementRepository.save = jest.fn().mockResolvedValue([]);

      const result = await service.createMonthlySettlements(
        initDto as any,
        mockCompanyOwner as User
      );

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should not call save when no new settlements to create', async () => {
      clientRepository.find = jest
        .fn()
        .mockResolvedValue([{ id: 'client-1', companyId: mockCompanyId, isActive: true }]);
      settlementRepository.find = jest.fn().mockResolvedValue([{ clientId: 'client-1' }]);

      await service.createMonthlySettlements(initDto as any, mockCompanyOwner as User);

      expect(settlementRepository.save).not.toHaveBeenCalled();
    });

    it('should include status history with AUTO_CREATED message', async () => {
      clientRepository.find = jest
        .fn()
        .mockResolvedValue([{ id: 'client-1', companyId: mockCompanyId, isActive: true }]);
      settlementRepository.find = jest.fn().mockResolvedValue([]);
      settlementRepository.save = jest.fn().mockResolvedValue([]);

      await service.createMonthlySettlements(initDto as any, mockCompanyOwner as User);

      expect(settlementRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            statusHistory: expect.arrayContaining([
              expect.objectContaining({
                status: SettlementStatus.PENDING,
                changedById: mockUserId,
                changedByEmail: mockCompanyOwner.email,
                notes: SETTLEMENT_MESSAGES.AUTO_CREATED,
              }),
            ]),
          }),
        ])
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and append to status history', async () => {
      const settlement = {
        ...mockSettlement,
        status: SettlementStatus.PENDING,
        statusHistory: [],
      };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateStatus(
        mockSettlementId,
        { status: SettlementStatus.IN_PROGRESS } as any,
        mockCompanyOwner as User
      );

      expect(result.status).toBe(SettlementStatus.IN_PROGRESS);
      expect(result.statusHistory).toHaveLength(1);
      expect(result.statusHistory[0]).toEqual(
        expect.objectContaining({
          status: SettlementStatus.IN_PROGRESS,
          changedById: mockUserId,
        })
      );
    });

    it('should set settledAt and settledById when transitioning to COMPLETED', async () => {
      const settlement = {
        ...mockSettlement,
        status: SettlementStatus.IN_PROGRESS,
        statusHistory: [],
        settledAt: null,
        settledById: null,
      };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateStatus(
        mockSettlementId,
        { status: SettlementStatus.COMPLETED } as any,
        mockCompanyOwner as User
      );

      expect(result.settledAt).toBeInstanceOf(Date);
      expect(result.settledById).toBe(mockUserId);
    });

    it('should clear settledAt when moving away from COMPLETED', async () => {
      const settlement = {
        ...mockSettlement,
        status: SettlementStatus.COMPLETED,
        statusHistory: [],
        settledAt: new Date(),
        settledById: mockUserId,
      };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateStatus(
        mockSettlementId,
        { status: SettlementStatus.IN_PROGRESS } as any,
        mockCompanyOwner as User
      );

      expect(result.settledAt).toBeNull();
      expect(result.settledById).toBeNull();
    });

    it('should throw SettlementAccessDeniedException for EMPLOYEE on other settlement', async () => {
      const otherSettlement = { ...mockSettlement, userId: 'other-user' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(otherSettlement);

      await expect(
        service.updateStatus(
          mockSettlementId,
          { status: SettlementStatus.IN_PROGRESS } as any,
          mockEmployee as User
        )
      ).rejects.toThrow(SettlementAccessDeniedException);
    });
  });

  describe('update', () => {
    it('should update notes and invoiceCount', async () => {
      const settlement = { ...mockSettlement, notes: null, invoiceCount: 0, statusHistory: [] };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.update(
        mockSettlementId,
        { notes: 'Updated notes', invoiceCount: 5 } as any,
        mockCompanyOwner as User
      );

      expect(result.notes).toBe('Updated notes');
      expect(result.invoiceCount).toBe(5);
    });

    it('should update status with history entry when status is provided', async () => {
      const settlement = { ...mockSettlement, statusHistory: [] };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.update(
        mockSettlementId,
        { status: SettlementStatus.IN_PROGRESS } as any,
        mockCompanyOwner as User
      );

      expect(result.status).toBe(SettlementStatus.IN_PROGRESS);
      expect(result.statusHistory).toHaveLength(1);
    });

    it('should set deadline to null when empty string provided', async () => {
      const settlement = { ...mockSettlement, deadline: new Date(), statusHistory: [] };
      settlementRepository.findOne = jest.fn().mockResolvedValue(settlement);
      settlementRepository.save = jest.fn().mockImplementation((s) => Promise.resolve(s));

      const result = await service.update(
        mockSettlementId,
        { deadline: '' } as any,
        mockCompanyOwner as User
      );

      expect(result.deadline).toBeNull();
    });

    it('should throw SettlementAccessDeniedException for EMPLOYEE on other settlement', async () => {
      const otherSettlement = { ...mockSettlement, userId: 'other-user' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(otherSettlement);

      await expect(
        service.update(mockSettlementId, { notes: 'test' } as any, mockEmployee as User)
      ).rejects.toThrow(SettlementAccessDeniedException);
    });
  });

  describe('assignToEmployee', () => {
    it('should assign settlement to a valid user', async () => {
      settlementRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(mockSettlement) // first call in assignToEmployee
        .mockResolvedValueOnce(mockSettlement); // second call via findOne reload
      userRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'employee-456', companyId: mockCompanyId });
      settlementRepository.save = jest
        .fn()
        .mockImplementation((s) => Promise.resolve({ ...s, id: mockSettlementId }));

      await service.assignToEmployee(
        mockSettlementId,
        { userId: 'employee-456' } as any,
        mockCompanyOwner as User
      );

      expect(settlementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'employee-456',
          assignedById: mockUserId,
        })
      );
    });

    it('should throw UserNotFoundException when assignee does not exist', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.assignToEmployee(
          mockSettlementId,
          { userId: 'nonexistent' } as any,
          mockCompanyOwner as User
        )
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should throw SettlementNotFoundException when settlement not found', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.assignToEmployee(
          mockSettlementId,
          { userId: 'employee-456' } as any,
          mockCompanyOwner as User
        )
      ).rejects.toThrow(SettlementNotFoundException);
    });
  });

  describe('bulkAssign', () => {
    it('should bulk assign settlements and return counts', async () => {
      userRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'employee-456', companyId: mockCompanyId });
      settlementRepository.find = jest.fn().mockResolvedValue([{ id: 'set-1' }, { id: 'set-2' }]);
      const mockQb = createMockQueryBuilder();
      mockQb.execute.mockResolvedValue({ affected: 2 });
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.bulkAssign(
        { userId: 'employee-456', settlementIds: ['set-1', 'set-2'] } as any,
        mockCompanyOwner as User
      );

      expect(result.assigned).toBe(2);
      expect(result.requested).toBe(2);
      expect(result.skippedIds).toHaveLength(0);
    });

    it('should return skipped IDs for nonexistent settlements', async () => {
      userRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'employee-456', companyId: mockCompanyId });
      settlementRepository.find = jest.fn().mockResolvedValue([{ id: 'set-1' }]);
      const mockQb = createMockQueryBuilder();
      mockQb.execute.mockResolvedValue({ affected: 1 });
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      const result = await service.bulkAssign(
        { userId: 'employee-456', settlementIds: ['set-1', 'set-nonexistent'] } as any,
        mockCompanyOwner as User
      );

      expect(result.assigned).toBe(1);
      expect(result.skippedIds).toContain('set-nonexistent');
    });

    it('should throw UserNotFoundException if assignee not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.bulkAssign(
          { userId: 'nonexistent', settlementIds: ['set-1'] } as any,
          mockCompanyOwner as User
        )
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should return zero assigned when no valid settlements found', async () => {
      userRepository.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'employee-456', companyId: mockCompanyId });
      settlementRepository.find = jest.fn().mockResolvedValue([]);

      const result = await service.bulkAssign(
        { userId: 'employee-456', settlementIds: ['bad-1', 'bad-2'] } as any,
        mockCompanyOwner as User
      );

      expect(result.assigned).toBe(0);
      expect(result.requested).toBe(2);
      expect(result.skippedIds).toEqual(['bad-1', 'bad-2']);
    });
  });

  describe('getAssignableUsers', () => {
    it('should return ADMIN users for ADMIN role', async () => {
      const adminUsers = [{ id: 'admin-1', role: UserRole.ADMIN }];
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      userRepository.find = jest.fn().mockResolvedValue(adminUsers);

      const result = await service.getAssignableUsers(mockSettlementId, mockAdmin as User);

      expect(result).toEqual(adminUsers);
      expect(userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, role: UserRole.ADMIN },
        })
      );
    });

    it('should return EMPLOYEE and COMPANY_OWNER users for non-ADMIN role', async () => {
      const companyUsers = [
        { id: 'emp-1', role: UserRole.EMPLOYEE },
        { id: 'owner-1', role: UserRole.COMPANY_OWNER },
      ];
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      userRepository.find = jest.fn().mockResolvedValue(companyUsers);

      const result = await service.getAssignableUsers(mockSettlementId, mockCompanyOwner as User);

      expect(result).toEqual(companyUsers);
      expect(userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            isActive: true,
          }),
        })
      );
    });
  });

  describe('getAllAssignableUsers', () => {
    it('should return ADMIN users for ADMIN role without calling tenantService', async () => {
      const adminUsers = [{ id: 'admin-1' }];
      userRepository.find = jest.fn().mockResolvedValue(adminUsers);

      const result = await service.getAllAssignableUsers(mockAdmin as User);

      expect(result).toEqual(adminUsers);
      expect(tenantService.getEffectiveCompanyId).not.toHaveBeenCalled();
    });

    it('should return company employees for non-ADMIN role', async () => {
      userRepository.find = jest.fn().mockResolvedValue([]);

      await service.getAllAssignableUsers(mockCompanyOwner as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
    });
  });

  describe('sendMissingInvoiceEmail', () => {
    const mockEmailConfig = {
      smtp: { host: 'smtp.test.com', port: 587 },
      imap: { host: 'imap.test.com', port: 993 },
    };

    it('should send email successfully with valid config', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      emailConfigService.getDecryptedEmailConfigByCompanyId = jest
        .fn()
        .mockResolvedValue(mockEmailConfig);
      emailSenderService.sendEmailAndSave = jest.fn().mockResolvedValue(undefined);

      const result = await service.sendMissingInvoiceEmail(
        mockSettlementId,
        mockCompanyOwner as User
      );

      expect(result.message).toBe('Email z prośbą o fakturę został wysłany');
      expect(emailSenderService.sendEmailAndSave).toHaveBeenCalledWith(
        mockEmailConfig.smtp,
        mockEmailConfig.imap,
        expect.objectContaining({
          to: mockClient.email,
          subject: expect.stringContaining('marzec 2026'),
        })
      );
    });

    it('should return message when client has no email', async () => {
      const noEmailSettlement = {
        ...mockSettlement,
        client: { ...mockClient, email: null },
      };
      settlementRepository.findOne = jest.fn().mockResolvedValue(noEmailSettlement);

      const result = await service.sendMissingInvoiceEmail(
        mockSettlementId,
        mockCompanyOwner as User
      );

      expect(result.message).toBe('Klient nie ma adresu email');
      expect(emailSenderService.sendEmailAndSave).not.toHaveBeenCalled();
    });

    it('should return message when no email config exists', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      emailConfigService.getDecryptedEmailConfigByCompanyId = jest.fn().mockResolvedValue(null);

      const result = await service.sendMissingInvoiceEmail(
        mockSettlementId,
        mockCompanyOwner as User
      );

      expect(result.message).toBe('Brak konfiguracji email dla firmy');
    });

    it('should throw InternalServerErrorException when email sending fails', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      emailConfigService.getDecryptedEmailConfigByCompanyId = jest
        .fn()
        .mockResolvedValue(mockEmailConfig);
      emailSenderService.sendEmailAndSave = jest
        .fn()
        .mockRejectedValue(new Error('SMTP connection failed'));

      await expect(
        service.sendMissingInvoiceEmail(mockSettlementId, mockCompanyOwner as User)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Multi-tenancy isolation', () => {
    it('should use TenantService to resolve companyId in findAll', async () => {
      const differentCompanyId = 'other-company-789';
      mockTenantService.getEffectiveCompanyId.mockResolvedValue(differentCompanyId);
      const mockQb = createMockQueryBuilder();
      settlementRepository.createQueryBuilder = jest.fn(() => mockQb) as any;

      await service.findAll({ month: 1, year: 2026 } as any, mockCompanyOwner as User);

      expect(mockQb.where).toHaveBeenCalledWith('settlement.companyId = :companyId', {
        companyId: differentCompanyId,
      });
    });

    it('should filter findOne by companyId from TenantService', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(mockSettlementId, mockCompanyOwner as User)).rejects.toThrow(
        SettlementNotFoundException
      );

      expect(settlementRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSettlementId, companyId: mockCompanyId },
        relations: expect.any(Array),
      });
    });

    it('should use companyId from TenantService in createMonthlySettlements', async () => {
      clientRepository.find = jest.fn().mockResolvedValue([]);
      settlementRepository.find = jest.fn().mockResolvedValue([]);

      await service.createMonthlySettlements(
        { month: 1, year: 2026 } as any,
        mockCompanyOwner as User
      );

      expect(clientRepository.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, isActive: true },
      });
    });
  });
});
