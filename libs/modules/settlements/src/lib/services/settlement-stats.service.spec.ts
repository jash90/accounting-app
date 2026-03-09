import { TenantService } from '@accounting/common/backend';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { MonthlySettlement, User, UserRole } from '@accounting/common';

import { SettlementStatsService } from './settlement-stats.service';

describe('SettlementStatsService', () => {
  let service: SettlementStatsService;
  let _settlementRepository: jest.Mocked<Repository<MonthlySettlement>>;
  let _userRepository: jest.Mocked<Repository<User>>;
  let tenantService: jest.Mocked<TenantService>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

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

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  let mockSettlementQb: ReturnType<typeof createMockQueryBuilder>;
  let mockUserRepository: Record<string, jest.Mock>;
  let mockSettlementRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    mockSettlementQb = createMockQueryBuilder();

    mockSettlementRepository = {
      createQueryBuilder: jest.fn(() => mockSettlementQb),
    };

    mockUserRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SettlementStatsService,
          useFactory: () => {
            return new SettlementStatsService(
              mockSettlementRepository as any,
              mockUserRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(MonthlySettlement),
          useValue: mockSettlementRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<SettlementStatsService>(SettlementStatsService);
    _settlementRepository = module.get(getRepositoryToken(MonthlySettlement));
    _userRepository = module.get(getRepositoryToken(User));
    tenantService = module.get(TenantService);
  });

  describe('getOverviewStats', () => {
    it('should return all status counts and completionRate', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue({
        total: '10',
        pending: '2',
        inProgress: '3',
        missingInvoiceVerification: '1',
        missingInvoice: '1',
        completed: '3',
        unassigned: '1',
        requiresAttention: '2',
      });

      const result = await service.getOverviewStats(1, 2024, mockCompanyOwner as User);

      expect(result).toEqual({
        total: 10,
        pending: 2,
        inProgress: 3,
        missingInvoiceVerification: 1,
        missingInvoice: 1,
        completed: 3,
        unassigned: 1,
        requiresAttention: 2,
        completionRate: 30, // 3/10 * 100 = 30
      });
    });

    it('should calculate completionRate correctly', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue({
        total: '4',
        pending: '1',
        inProgress: '0',
        missingInvoiceVerification: '0',
        missingInvoice: '0',
        completed: '3',
        unassigned: '0',
        requiresAttention: '0',
      });

      const result = await service.getOverviewStats(1, 2024, mockCompanyOwner as User);

      expect(result.completionRate).toBe(75); // 3/4 * 100 = 75
    });

    it('should return zeros and completionRate 0 when no data', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      const result = await service.getOverviewStats(1, 2024, mockCompanyOwner as User);

      expect(result).toEqual({
        total: 0,
        pending: 0,
        inProgress: 0,
        missingInvoiceVerification: 0,
        missingInvoice: 0,
        completed: 0,
        unassigned: 0,
        requiresAttention: 0,
        completionRate: 0,
      });
    });

    it('should filter by userId for EMPLOYEE role', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue({
        total: '5',
        pending: '1',
        inProgress: '2',
        missingInvoiceVerification: '0',
        missingInvoice: '0',
        completed: '2',
        unassigned: '0',
        requiresAttention: '0',
      });

      await service.getOverviewStats(1, 2024, mockEmployee as User);

      // EMPLOYEE is not owner/admin, so userId filter is added
      expect(mockSettlementQb.andWhere).toHaveBeenCalledWith('settlement.userId = :userId', {
        userId: mockEmployee.id,
      });
    });

    it('should NOT filter by userId for COMPANY_OWNER', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue({
        total: '0',
        pending: '0',
        inProgress: '0',
        missingInvoiceVerification: '0',
        missingInvoice: '0',
        completed: '0',
        unassigned: '0',
        requiresAttention: '0',
      });

      await service.getOverviewStats(1, 2024, mockCompanyOwner as User);

      // Should not have the userId filter call
      const andWhereCalls = mockSettlementQb.andWhere.mock.calls;
      const userIdCall = andWhereCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('userId')
      );
      expect(userIdCall).toBeUndefined();
    });

    it('should use tenant service for companyId', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      await service.getOverviewStats(3, 2024, mockCompanyOwner as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
      expect(mockSettlementQb.where).toHaveBeenCalledWith('settlement.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should filter by month and year', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      await service.getOverviewStats(6, 2025, mockCompanyOwner as User);

      expect(mockSettlementQb.andWhere).toHaveBeenCalledWith('settlement.month = :month', {
        month: 6,
      });
      expect(mockSettlementQb.andWhere).toHaveBeenCalledWith('settlement.year = :year', {
        year: 2025,
      });
    });
  });

  describe('getEmployeeStats', () => {
    const mockEmployees = [
      { id: 'emp-1', email: 'emp1@co.com', firstName: 'Jan', lastName: 'A' },
      { id: 'emp-2', email: 'emp2@co.com', firstName: 'Anna', lastName: 'B' },
    ];

    it('should return per-employee stats sorted by total DESC', async () => {
      mockUserRepository.find = jest.fn().mockResolvedValue(mockEmployees);

      // Second query builder for settlement stats
      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([
        {
          userId: 'emp-1',
          total: '3',
          pending: '1',
          inProgress: '1',
          missingInvoiceVerification: '0',
          missingInvoice: '0',
          completed: '1',
        },
        {
          userId: 'emp-2',
          total: '7',
          pending: '2',
          inProgress: '2',
          missingInvoiceVerification: '1',
          missingInvoice: '1',
          completed: '1',
        },
      ]);
      mockSettlementRepository.createQueryBuilder = jest.fn(() => statsQb);

      const result = await service.getEmployeeStats(1, 2024, mockCompanyOwner as User);

      expect(result.employees).toHaveLength(2);
      // Sorted by total DESC — emp-2 (7) before emp-1 (3)
      expect(result.employees[0].userId).toBe('emp-2');
      expect(result.employees[0].total).toBe(7);
      expect(result.employees[1].userId).toBe('emp-1');
      expect(result.employees[1].total).toBe(3);
    });

    it('should calculate completionRate per employee', async () => {
      mockUserRepository.find = jest.fn().mockResolvedValue([mockEmployees[0]]);

      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([
        {
          userId: 'emp-1',
          total: '4',
          pending: '1',
          inProgress: '0',
          missingInvoiceVerification: '0',
          missingInvoice: '0',
          completed: '3',
        },
      ]);
      mockSettlementRepository.createQueryBuilder = jest.fn(() => statsQb);

      const result = await service.getEmployeeStats(1, 2024, mockCompanyOwner as User);

      expect(result.employees[0].completionRate).toBe(75);
    });

    it('should handle employees with no settlements', async () => {
      mockUserRepository.find = jest.fn().mockResolvedValue(mockEmployees);

      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([]); // No settlement data
      mockSettlementRepository.createQueryBuilder = jest.fn(() => statsQb);

      const result = await service.getEmployeeStats(1, 2024, mockCompanyOwner as User);

      expect(result.employees).toHaveLength(2);
      expect(result.employees[0].total).toBe(0);
      expect(result.employees[0].completionRate).toBe(0);
    });

    it('should return empty employees array when no employees exist', async () => {
      mockUserRepository.find = jest.fn().mockResolvedValue([]);

      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([]);
      mockSettlementRepository.createQueryBuilder = jest.fn(() => statsQb);

      const result = await service.getEmployeeStats(1, 2024, mockCompanyOwner as User);

      expect(result.employees).toEqual([]);
    });

    it('should fetch active employees for the company', async () => {
      mockUserRepository.find = jest.fn().mockResolvedValue([]);

      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([]);
      mockSettlementRepository.createQueryBuilder = jest.fn(() => statsQb);

      await service.getEmployeeStats(1, 2024, mockCompanyOwner as User);

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, isActive: true },
        select: ['id', 'email', 'firstName', 'lastName'],
      });
    });
  });

  describe('getMyStats', () => {
    it('should return personal stats for user', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue({
        total: '5',
        pending: '1',
        inProgress: '2',
        missingInvoiceVerification: '0',
        missingInvoice: '1',
        completed: '1',
      });

      const result = await service.getMyStats(1, 2024, mockEmployee as User);

      expect(result).toEqual({
        total: 5,
        pending: 1,
        inProgress: 2,
        missingInvoiceVerification: 0,
        missingInvoice: 1,
        completed: 1,
        completionRate: 20, // 1/5 * 100 = 20
      });
    });

    it('should filter by userId of the requesting user', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      await service.getMyStats(1, 2024, mockEmployee as User);

      expect(mockSettlementQb.andWhere).toHaveBeenCalledWith('settlement.userId = :userId', {
        userId: mockEmployee.id,
      });
    });

    it('should return zeros when no data exists', async () => {
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      const result = await service.getMyStats(1, 2024, mockEmployee as User);

      expect(result.total).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });

  describe('Multi-tenancy isolation', () => {
    it('should always use TenantService to resolve companyId', async () => {
      const differentCompanyId = 'other-company-999';
      mockTenantService.getEffectiveCompanyId.mockResolvedValue(differentCompanyId);
      mockSettlementQb.getRawOne.mockResolvedValue(null);

      await service.getOverviewStats(1, 2024, mockCompanyOwner as User);

      expect(mockSettlementQb.where).toHaveBeenCalledWith('settlement.companyId = :companyId', {
        companyId: differentCompanyId,
      });
    });
  });
});
