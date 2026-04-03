import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { MonthlySettlement, SettlementStatus, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { SettlementExportService } from './settlement-export.service';

describe('SettlementExportService', () => {
  let service: SettlementExportService;
  let _settlementRepository: jest.Mocked<Repository<MonthlySettlement>>;
  let systemCompanyService: jest.Mocked<SystemCompanyService>;

  const mockCompanyId = 'company-123';

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSettlements: Partial<MonthlySettlement>[] = [
    {
      id: 's1',
      client: { name: 'Firma ABC', nip: '1234567890' } as any,
      month: 1,
      year: 2024,
      status: SettlementStatus.COMPLETED,
      assignedUser: { firstName: 'Jan', lastName: 'Kowalski' } as any,
      priority: 1,
      deadline: new Date('2024-01-31'),
      documentsComplete: true,
      notes: 'Wszystko OK',
    },
    {
      id: 's2',
      client: { name: 'Firma XYZ', nip: '9876543210' } as any,
      month: 1,
      year: 2024,
      status: SettlementStatus.PENDING,
      assignedUser: null as any,
      priority: 0,
      deadline: null as any,
      documentsComplete: false,
      notes: '',
    },
  ];

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockSettlements),
  });

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  let mockQb: ReturnType<typeof createMockQueryBuilder>;
  let mockSettlementRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    mockQb = createMockQueryBuilder();

    mockSettlementRepository = {
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SettlementExportService,
          useFactory: () => {
            return new SettlementExportService(
              mockSettlementRepository as any,
              mockSystemCompanyService as any
            );
          },
        },
        {
          provide: getRepositoryToken(MonthlySettlement),
          useValue: mockSettlementRepository,
        },
        {
          provide: SystemCompanyService,
          useValue: mockSystemCompanyService,
        },
      ],
    }).compile();

    service = module.get<SettlementExportService>(SettlementExportService);
    _settlementRepository = module.get(getRepositoryToken(MonthlySettlement));
    systemCompanyService = module.get(SystemCompanyService);
  });

  describe('exportToCsv', () => {
    it('should return a Buffer with Polish headers and data rows', async () => {
      const result = await service.exportToCsv({}, mockUser as User);

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');

      // Check Polish headers
      expect(csv).toContain('Klient');
      expect(csv).toContain('NIP');
      expect(csv).toContain('Status');
      expect(csv).toContain('Przypisany do');
      expect(csv).toContain('Dokumenty kompletne');

      // Check data
      expect(csv).toContain('Firma ABC');
      expect(csv).toContain('1234567890');
      expect(csv).toContain('Jan Kowalski');
    });

    it('should format boolean documentsComplete as Tak/Nie', async () => {
      const result = await service.exportToCsv({}, mockUser as User);
      const csv = result.toString('utf-8');

      expect(csv).toContain('Tak');
      expect(csv).toContain('Nie');
    });

    it('should apply month, year, status, and assigneeId filters', async () => {
      const filters = {
        month: 3,
        year: 2025,
        status: SettlementStatus.PENDING,
        assigneeId: 'assignee-1',
      };

      await service.exportToCsv(filters as any, mockUser as User);

      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.month = :month', { month: 3 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.year = :year', { year: 2025 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.status = :status', {
        status: SettlementStatus.PENDING,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('settlement.userId = :assigneeId', {
        assigneeId: 'assignee-1',
      });
    });

    it('should handle empty results', async () => {
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.exportToCsv({}, mockUser as User);

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      // Should still contain headers
      expect(csv).toContain('Klient');
    });

    it('should use tenant service for companyId filtering', async () => {
      await service.exportToCsv({}, mockUser as User);

      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(mockQb.where).toHaveBeenCalledWith('settlement.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });
  });
});
