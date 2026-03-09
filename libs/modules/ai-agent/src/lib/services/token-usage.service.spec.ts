import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Company, TokenUsage, type User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { TokenUsageService } from './token-usage.service';

describe('TokenUsageService', () => {
  let service: TokenUsageService;
  let usageRepo: jest.Mocked<Repository<TokenUsage>>;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;
  const mockOwner = { id: 'owner-1', companyId, role: UserRole.COMPANY_OWNER } as User;
  const mockAdmin = { id: 'admin-1', companyId: null, role: UserRole.ADMIN } as unknown as User;

  const mockUsageRecord: TokenUsage = {
    id: 'usage-1',
    userId: mockUser.id,
    companyId,
    date: new Date(),
    totalInputTokens: 100,
    totalOutputTokens: 50,
    totalTokens: 150,
    conversationCount: 1,
    messageCount: 2,
  } as unknown as TokenUsage;

  function createMockQueryBuilder() {
    const qb: any = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getRawOne = jest.fn().mockResolvedValue({ total: '0' });
    return qb;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    usageRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as unknown as jest.Mocked<Repository<TokenUsage>>;

    companyRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Company>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TokenUsageService,
          useFactory: () =>
            new TokenUsageService(
              usageRepo as any,
              companyRepo as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(TokenUsage), useValue: usageRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
      ],
    }).compile();

    service = module.get(TokenUsageService);
  });

  describe('trackUsage', () => {
    it('should create new usage record when none exists for today', async () => {
      usageRepo.findOne.mockResolvedValue(null);
      usageRepo.create.mockReturnValue(mockUsageRecord);
      usageRepo.save.mockResolvedValue(mockUsageRecord);

      await service.trackUsage(mockUser, 100, 50);

      expect(usageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          companyId,
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalTokens: 150,
        })
      );
      expect(usageRepo.save).toHaveBeenCalled();
    });

    it('should update existing usage record for today', async () => {
      const existingUsage = {
        ...mockUsageRecord,
        totalInputTokens: 200,
        totalOutputTokens: 100,
        totalTokens: 300,
        messageCount: 3,
      } as TokenUsage;
      usageRepo.findOne.mockResolvedValue(existingUsage);
      usageRepo.save.mockResolvedValue(existingUsage);

      await service.trackUsage(mockUser, 50, 25);

      expect(existingUsage.totalInputTokens).toBe(250);
      expect(existingUsage.totalOutputTokens).toBe(125);
      expect(existingUsage.totalTokens).toBe(375);
      expect(existingUsage.messageCount).toBe(4);
      expect(usageRepo.save).toHaveBeenCalledWith(existingUsage);
    });

    it('should resolve companyId via systemCompanyService', async () => {
      usageRepo.findOne.mockResolvedValue(null);
      usageRepo.create.mockReturnValue(mockUsageRecord);
      usageRepo.save.mockResolvedValue(mockUsageRecord);

      await service.trackUsage(mockUser, 10, 5);

      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getMyUsage', () => {
    it('should return usage stats for the given period', async () => {
      usageRepo.find.mockResolvedValue([mockUsageRecord]);

      const result = await service.getMyUsage(mockUser, 30);

      expect(result.totalTokens).toBe(150);
      expect(result.totalInputTokens).toBe(100);
      expect(result.totalOutputTokens).toBe(50);
      expect(result.dailyUsage).toEqual([mockUsageRecord]);
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should return zeroed stats when no usage records exist', async () => {
      usageRepo.find.mockResolvedValue([]);

      const result = await service.getMyUsage(mockUser, 7);

      expect(result.totalTokens).toBe(0);
      expect(result.totalInputTokens).toBe(0);
      expect(result.totalOutputTokens).toBe(0);
      expect(result.dailyUsage).toEqual([]);
    });
  });

  describe('getCompanyUsage', () => {
    it('should return company usage for COMPANY_OWNER', async () => {
      companyRepo.findOne.mockResolvedValue({ id: companyId, name: 'Test Co' } as Company);
      usageRepo.find.mockResolvedValue([
        {
          ...mockUsageRecord,
          user: { id: mockUser.id, email: 'test@test.com', firstName: 'John', lastName: 'Doe' },
        } as any,
      ]);

      const result = await service.getCompanyUsage(mockOwner, 30);

      expect(result.companyId).toBe(companyId);
      expect(result.companyName).toBe('Test Co');
      expect(result.totalTokens).toBe(150);
      expect(result.users).toHaveLength(1);
    });

    it('should throw ForbiddenException for EMPLOYEE role', async () => {
      await expect(service.getCompanyUsage(mockUser, 30)).rejects.toThrow(
        'Only company owners can view company usage'
      );
    });

    it('should throw ForbiddenException for non-admin user without companyId', async () => {
      const noCompanyOwner = {
        id: 'o-1',
        companyId: null,
        role: UserRole.COMPANY_OWNER,
      } as unknown as User;

      await expect(service.getCompanyUsage(noCompanyOwner, 30)).rejects.toThrow(
        'User must belong to a company'
      );
    });
  });

  describe('getUserMonthlyTotal', () => {
    it('should return monthly total from query builder', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total: '5000' });
      usageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUserMonthlyTotal(mockUser);

      expect(result).toBe(5000);
    });

    it('should return 0 when no usage exists', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total: null });
      usageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUserMonthlyTotal(mockUser);

      expect(result).toBe(0);
    });
  });

  describe('getCompanyMonthlyTotal', () => {
    it('should return company monthly total from query builder', async () => {
      const qb = createMockQueryBuilder();
      qb.getRawOne.mockResolvedValue({ total: '25000' });
      usageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCompanyMonthlyTotal(companyId);

      expect(result).toBe(25000);
    });
  });

  describe('getAllCompaniesUsage', () => {
    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.getAllCompaniesUsage(mockUser, 30)).rejects.toThrow(
        'Only admins can view all companies usage'
      );
    });

    it('should return usage for all non-system companies', async () => {
      companyRepo.find.mockResolvedValue([
        { id: 'c-1', name: 'Company A', isSystemCompany: false },
        { id: 'c-2', name: 'Company B', isSystemCompany: false },
      ] as Company[]);
      usageRepo.find.mockResolvedValue([]);

      const result = await service.getAllCompaniesUsage(mockAdmin, 30);

      expect(result).toHaveLength(2);
      expect(result[0].companyName).toBe('Company A');
      expect(result[1].companyName).toBe('Company B');
    });
  });
});
