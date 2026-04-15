import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { TimeEntry } from '@accounting/common';

import { TimeEntryOverlapException } from '../exceptions';
import { TimeEntryOverlapService } from './time-entry-overlap.service';

describe('TimeEntryOverlapService', () => {
  let service: TimeEntryOverlapService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;

  const userId = 'user-123';
  const companyId = 'company-123';

  const createMockQueryBuilder = (count: number = 0) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntryOverlapService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder(0)),
          },
        },
      ],
    }).compile();

    service = module.get<TimeEntryOverlapService>(TimeEntryOverlapService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enforceNoTimeOverlap', () => {
    it('should not throw when no overlapping entries exist', async () => {
      const qb = createMockQueryBuilder(0);
      (entryRepository as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');

      try {
        await service.enforceNoTimeOverlap(userId, companyId, start, end);
        expect(true).toBe(true); // No exception thrown
      } catch {
        expect.fail('Should not have thrown');
      }
    });

    it('should throw TimeEntryOverlapException when overlap detected', async () => {
      const qb = createMockQueryBuilder(1);
      (entryRepository as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');

      await expect(service.enforceNoTimeOverlap(userId, companyId, start, end)).rejects.toThrow(
        TimeEntryOverlapException
      );
    });

    it('should handle null endTime (running timer)', async () => {
      const qb = createMockQueryBuilder(0);
      (entryRepository as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const start = new Date('2024-01-15T09:00:00Z');

      try {
        await service.enforceNoTimeOverlap(userId, companyId, start, null);
        expect(true).toBe(true);
      } catch {
        expect.fail('Should not have thrown');
      }
    });

    it('should exclude specified entry ID from check', async () => {
      const qb = createMockQueryBuilder(0);
      (entryRepository as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');

      try {
        await service.enforceNoTimeOverlap(userId, companyId, start, end, 'exclude-id');
        expect(true).toBe(true);
      } catch {
        expect.fail('Should not have thrown');
      }

      // Verify andWhere was called for exclude
      const andWhereCalls = qb.andWhere.mock.calls;
      const excludeCall = andWhereCalls.find((c: any[]) => c[0].includes('id !='));
      expect(excludeCall).toBeDefined();
    });
  });

  describe('enforceNoTimeOverlapWithLock', () => {
    it('should not throw when no overlapping entries exist', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');

      try {
        await service.enforceNoTimeOverlapWithLock(manager as any, userId, companyId, start, end);
        expect(qb.setLock).toHaveBeenCalledWith('pessimistic_read');
      } catch {
        expect.fail('Should not have thrown');
      }
    });

    it('should throw when overlap detected with lock', async () => {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');

      await expect(
        service.enforceNoTimeOverlapWithLock(manager as any, userId, companyId, start, end)
      ).rejects.toThrow(TimeEntryOverlapException);
    });
  });
});
