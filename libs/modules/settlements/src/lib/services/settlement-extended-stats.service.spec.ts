import { TenantService } from '@accounting/common/backend';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { MonthlySettlement, SettlementStatus, UserRole, type User } from '@accounting/common';

import { SettlementExtendedStatsService } from './settlement-extended-stats.service';

describe('SettlementExtendedStatsService', () => {
  let service: SettlementExtendedStatsService;
  let _settlementRepository: jest.Mocked<Repository<MonthlySettlement>>;
  let tenantService: jest.Mocked<TenantService>;

  const mockCompanyId = 'company-123';

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  let mockQb: ReturnType<typeof createMockQueryBuilder>;
  let mockSettlementRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    mockQb = createMockQueryBuilder();

    mockSettlementRepository = {
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SettlementExtendedStatsService,
          useFactory: () => {
            return new SettlementExtendedStatsService(
              mockSettlementRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(MonthlySettlement),
          useValue: mockSettlementRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<SettlementExtendedStatsService>(SettlementExtendedStatsService);
    _settlementRepository = module.get(getRepositoryToken(MonthlySettlement));
    tenantService = module.get(TenantService);
  });

  describe('getCompletionDurationStats', () => {
    it('should return longest, shortest, and average duration', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      mockQb.getMany.mockResolvedValue([
        {
          id: 's1',
          client: { name: 'Client A' },
          month: 1,
          year: 2024,
          settledAt: now,
          createdAt: threeDaysAgo,
        },
        {
          id: 's2',
          client: { name: 'Client B' },
          month: 1,
          year: 2024,
          settledAt: now,
          createdAt: tenDaysAgo,
        },
      ]);

      const result = await service.getCompletionDurationStats(mockUser as User);

      // longest should have ~10 days, shortest ~3 days
      expect(result.longest).toBeDefined();
      expect(result.shortest).toBeDefined();
      expect(result.averageDurationDays).toBeGreaterThan(0);
      expect(result.longest.length).toBeGreaterThanOrEqual(1);
      expect(result.shortest.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty arrays when no completed settlements exist', async () => {
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.getCompletionDurationStats(mockUser as User);

      expect(result.longest).toEqual([]);
      expect(result.shortest).toEqual([]);
      expect(result.averageDurationDays).toBe(0);
    });

    it('should filter by COMPLETED status and non-null settledAt', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.getCompletionDurationStats(mockUser as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('s.status = :status', {
        status: SettlementStatus.COMPLETED,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('s.settledAt IS NOT NULL');
    });

    it('should filter by companyId for tenant isolation', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.getCompletionDurationStats(mockUser as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockUser);
      expect(mockQb.where).toHaveBeenCalledWith('s.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should handle single settlement', async () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      mockQb.getMany.mockResolvedValue([
        {
          id: 's1',
          client: { name: 'Only Client' },
          month: 2,
          year: 2024,
          settledAt: now,
          createdAt: fiveDaysAgo,
        },
      ]);

      const result = await service.getCompletionDurationStats(mockUser as User);

      // With single item, longest and shortest should be the same
      expect(result.longest).toHaveLength(1);
      expect(result.shortest).toHaveLength(1);
      expect(result.averageDurationDays).toBe(5);
    });
  });

  describe('getEmployeeCompletionRanking', () => {
    it('should return rankings sorted by completedCount DESC', async () => {
      mockQb.getRawMany.mockResolvedValue([
        {
          userId: 'u1',
          email: 'jan@co.com',
          firstName: 'Jan',
          lastName: 'A',
          completedCount: '10',
        },
        {
          userId: 'u2',
          email: 'anna@co.com',
          firstName: 'Anna',
          lastName: 'B',
          completedCount: '5',
        },
      ]);

      const result = await service.getEmployeeCompletionRanking(mockUser as User);

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].completedCount).toBe(10);
      expect(result.rankings[1].completedCount).toBe(5);
    });

    it('should return empty rankings when no data', async () => {
      mockQb.getRawMany.mockResolvedValue([]);

      const result = await service.getEmployeeCompletionRanking(mockUser as User);

      expect(result.rankings).toEqual([]);
    });

    it('should filter by COMPLETED status and non-null userId', async () => {
      mockQb.getRawMany.mockResolvedValue([]);

      await service.getEmployeeCompletionRanking(mockUser as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('s.status = :status', {
        status: SettlementStatus.COMPLETED,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('s.userId IS NOT NULL');
    });
  });

  describe('getBlockedClientsStats', () => {
    it('should return clients with MISSING_INVOICE and MISSING_INVOICE_VERIFICATION counts', async () => {
      mockQb.getRawMany.mockResolvedValue([
        { clientId: 'c1', clientName: 'Client A', blockCount: '3' },
        { clientId: 'c2', clientName: 'Client B', blockCount: '1' },
      ]);

      const result = await service.getBlockedClientsStats(mockUser as User);

      expect(result.clients).toHaveLength(2);
      expect(result.clients[0]).toEqual({
        clientId: 'c1',
        clientName: 'Client A',
        blockCount: 3,
      });
      expect(result.clients[1]).toEqual({
        clientId: 'c2',
        clientName: 'Client B',
        blockCount: 1,
      });
    });

    it('should return empty clients array when no blocked settlements', async () => {
      mockQb.getRawMany.mockResolvedValue([]);

      const result = await service.getBlockedClientsStats(mockUser as User);

      expect(result.clients).toEqual([]);
    });

    it('should filter by blocked statuses', async () => {
      mockQb.getRawMany.mockResolvedValue([]);

      await service.getBlockedClientsStats(mockUser as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('s.status IN (:...blockedStatuses)', {
        blockedStatuses: [
          SettlementStatus.MISSING_INVOICE,
          SettlementStatus.MISSING_INVOICE_VERIFICATION,
        ],
      });
    });
  });
});
