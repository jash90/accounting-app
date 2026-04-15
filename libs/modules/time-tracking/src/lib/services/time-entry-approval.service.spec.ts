import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { TimeEntry, TimeEntryStatus, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TimeEntryInvalidStatusException, TimeEntryNotFoundException } from '../exceptions';
import { TimeEntryApprovalService } from './time-entry-approval.service';

describe('TimeEntryApprovalService', () => {
  let service: TimeEntryApprovalService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let _systemCompanyService: jest.Mocked<SystemCompanyService>;
  let dataSource: any;

  const mockCompanyId = 'company-123';

  const ownerUser: Partial<User> = {
    id: 'owner-id',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const employeeUser: Partial<User> = {
    id: 'employee-id',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
  };

  const draftEntry: any = {
    id: 'entry-123',
    status: TimeEntryStatus.DRAFT,
    companyId: mockCompanyId,
    userId: 'employee-id',
    isActive: true,
  };

  const submittedEntry: any = {
    id: 'entry-456',
    status: TimeEntryStatus.SUBMITTED,
    companyId: mockCompanyId,
    userId: 'employee-id',
    isActive: true,
  };

  const createMockTransactionQb = (entry: any = null) => ({
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(entry),
  });

  const createMockManager = (qb: any) => ({
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  });

  const createMockDataSource = (manager: any) => ({
    transaction: jest.fn().mockImplementation((fn) => fn(manager)),
  });

  beforeEach(async () => {
    const qb = createMockTransactionQb(submittedEntry);
    const manager = createMockManager(qb);
    const ds = createMockDataSource(manager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntryApprovalService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: {
            count: jest.fn().mockResolvedValue(1),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: SystemCompanyService,
          useValue: {
            getCompanyIdForUser: jest.fn().mockResolvedValue(mockCompanyId),
          },
        },
        {
          provide: DataSource,
          useValue: ds,
        },
      ],
    }).compile();

    service = module.get<TimeEntryApprovalService>(TimeEntryApprovalService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    systemCompanyService = module.get(SystemCompanyService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitEntry', () => {
    it('should submit a draft entry', async () => {
      const qb = createMockTransactionQb({ ...draftEntry });
      const manager = createMockManager(qb);
      dataSource.transaction.mockImplementation((fn: any) => fn(manager));

      const result = await service.submitEntry('entry-123', employeeUser as User);

      expect(result.status).toBe(TimeEntryStatus.SUBMITTED);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it('should throw if entry not found', async () => {
      const qb = createMockTransactionQb(null);
      const manager = createMockManager(qb);
      dataSource.transaction.mockImplementation((fn: any) => fn(manager));

      await expect(service.submitEntry('nonexistent', employeeUser as User)).rejects.toThrow(
        TimeEntryNotFoundException
      );
    });

    it('should throw if entry is not in DRAFT status', async () => {
      const qb = createMockTransactionQb({ ...submittedEntry });
      const manager = createMockManager(qb);
      dataSource.transaction.mockImplementation((fn: any) => fn(manager));

      await expect(service.submitEntry('entry-456', employeeUser as User)).rejects.toThrow(
        TimeEntryInvalidStatusException
      );
    });
  });

  describe('approveEntry', () => {
    it('should approve and auto-lock a submitted entry', async () => {
      const qb = createMockTransactionQb({ ...submittedEntry });
      const manager = createMockManager(qb);
      dataSource.transaction.mockImplementation((fn: any) => fn(manager));

      const result = await service.approveEntry('entry-456', ownerUser as User);

      expect(result.status).toBe(TimeEntryStatus.APPROVED);
      expect(result.approvedById).toBe(ownerUser.id);
      expect(result.isLocked).toBe(true);
    });

    it('should throw if employee tries to approve', async () => {
      await expect(service.approveEntry('entry-456', employeeUser as User)).rejects.toThrow(); // ForbiddenException
    });
  });

  describe('rejectEntry', () => {
    it('should reject a submitted entry with note', async () => {
      const qb = createMockTransactionQb({ ...submittedEntry });
      const manager = createMockManager(qb);
      dataSource.transaction.mockImplementation((fn: any) => fn(manager));

      const result = await service.rejectEntry(
        'entry-456',
        'Not enough details',
        ownerUser as User
      );

      expect(result.status).toBe(TimeEntryStatus.REJECTED);
      expect(result.rejectionNote).toBe('Not enough details');
    });

    it('should throw if employee tries to reject', async () => {
      await expect(
        service.rejectEntry('entry-456', 'reason', employeeUser as User)
      ).rejects.toThrow();
    });
  });

  describe('bulkApprove', () => {
    it('should return approved count', async () => {
      (entryRepository.count as jest.Mock).mockResolvedValue(3);
      (entryRepository.update as jest.Mock).mockResolvedValue({ affected: 3 });

      const result = await service.bulkApprove(['id1', 'id2', 'id3'], ownerUser as User);

      expect(result.approved).toBe(3);
      expect(result.notFound).toBe(0);
    });

    it('should report not found count', async () => {
      (entryRepository.count as jest.Mock).mockResolvedValue(1);
      (entryRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.bulkApprove(['id1', 'id2', 'id3'], ownerUser as User);

      expect(result.approved).toBe(1);
      expect(result.notFound).toBe(2);
    });
  });

  describe('bulkReject', () => {
    it('should reject entries with note', async () => {
      (entryRepository.count as jest.Mock).mockResolvedValue(2);
      (entryRepository.update as jest.Mock).mockResolvedValue({ affected: 2 });

      const result = await service.bulkReject(['id1', 'id2'], 'batch reject', ownerUser as User);

      expect(result.rejected).toBe(2);
      expect(result.notFound).toBe(0);
    });

    it('should throw if employee tries bulk reject', async () => {
      await expect(service.bulkReject(['id1'], 'reason', employeeUser as User)).rejects.toThrow();
    });
  });
});
