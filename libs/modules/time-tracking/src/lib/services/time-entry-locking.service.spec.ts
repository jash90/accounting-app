import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { TimeEntry, UserRole, type User } from '@accounting/common';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { TimeEntryLockedException, TimeEntryUnlockNotAuthorizedException } from '../exceptions';
import { TimeEntryLockingService } from './time-entry-locking.service';
import { TimeSettingsService } from './time-settings.service';

describe('TimeEntryLockingService', () => {
  let service: TimeEntryLockingService;
  let entryRepository: jest.Mocked<Repository<TimeEntry>>;
  let changeLogService: jest.Mocked<ChangeLogService>;
  let settingsService: jest.Mocked<TimeSettingsService>;

  const ownerUser: Partial<User> = {
    id: 'owner-id',
    role: UserRole.COMPANY_OWNER,
    companyId: 'company-123',
  };

  const employeeUser: Partial<User> = {
    id: 'employee-id',
    role: UserRole.EMPLOYEE,
    companyId: 'company-123',
  };

  const mockEntry: any = {
    id: 'entry-123',
    isLocked: false,
    lockedAt: null,
    lockedById: null,
    startTime: new Date('2024-01-15T09:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntryLockingService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: {
            save: jest.fn().mockImplementation((entry) => Promise.resolve(entry)),
          },
        },
        {
          provide: ChangeLogService,
          useValue: {
            logUpdate: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TimeSettingsService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue({ lockEntriesAfterDays: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<TimeEntryLockingService>(TimeEntryLockingService);
    entryRepository = module.get(getRepositoryToken(TimeEntry));
    changeLogService = module.get(ChangeLogService);
    settingsService = module.get(TimeSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('lockEntry', () => {
    it('should throw if user is not owner or admin', async () => {
      await expect(service.lockEntry(mockEntry, employeeUser as User)).rejects.toThrow(
        TimeEntryUnlockNotAuthorizedException
      );
    });

    it('should lock an unlocked entry', async () => {
      const result = await service.lockEntry({ ...mockEntry }, ownerUser as User);

      expect(result.isLocked).toBe(true);
      expect(result.lockedById).toBe(ownerUser.id);
      expect(result.lockedAt).toBeInstanceOf(Date);
      expect(entryRepository.save).toHaveBeenCalled();
      expect(changeLogService.logUpdate).toHaveBeenCalled();
    });

    it('should return entry as-is if already locked', async () => {
      const lockedEntry = {
        ...mockEntry,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: 'other',
      };
      const result = await service.lockEntry(lockedEntry, ownerUser as User);

      expect(result.isLocked).toBe(true);
      expect(entryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('unlockEntry', () => {
    it('should throw if user is not owner or admin', async () => {
      const lockedEntry = { ...mockEntry, isLocked: true };
      await expect(service.unlockEntry(lockedEntry, employeeUser as User)).rejects.toThrow(
        TimeEntryUnlockNotAuthorizedException
      );
    });

    it('should unlock a locked entry', async () => {
      const lockedEntry = {
        ...mockEntry,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: 'owner',
      };
      const result = await service.unlockEntry(lockedEntry, ownerUser as User);

      expect(result.isLocked).toBe(false);
      expect(result.lockedAt).toBeNull();
      expect(result.lockedById).toBeNull();
      expect(changeLogService.logUpdate).toHaveBeenCalled();
    });

    it('should return entry as-is if already unlocked', async () => {
      const result = await service.unlockEntry({ ...mockEntry }, ownerUser as User);
      expect(result.isLocked).toBe(false);
      expect(entryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('enforceEntryNotLocked', () => {
    it('should not throw for unlocked entry without age policy', async () => {
      try {
        await service.enforceEntryNotLocked({ ...mockEntry }, ownerUser as User);
        expect(true).toBe(true);
      } catch {
        expect.fail('Should not have thrown');
      }
    });

    it('should throw for explicitly locked entry', async () => {
      const lockedEntry = { ...mockEntry, isLocked: true };
      await expect(service.enforceEntryNotLocked(lockedEntry, ownerUser as User)).rejects.toThrow(
        TimeEntryLockedException
      );
    });

    it('should throw for entry past age-based lock period', async () => {
      (settingsService.getSettings as jest.Mock).mockResolvedValue({ lockEntriesAfterDays: 30 });

      const oldEntry = {
        ...mockEntry,
        startTime: new Date('2020-01-15T09:00:00Z'), // Very old entry
      };

      await expect(service.enforceEntryNotLocked(oldEntry, ownerUser as User)).rejects.toThrow(
        TimeEntryLockedException
      );
    });

    it('should not throw for recent entry within lock period', async () => {
      (settingsService.getSettings as jest.Mock).mockResolvedValue({ lockEntriesAfterDays: 30 });

      const recentEntry = {
        ...mockEntry,
        startTime: new Date(), // Just now
      };

      try {
        await service.enforceEntryNotLocked(recentEntry, ownerUser as User);
        expect(true).toBe(true);
      } catch {
        expect.fail('Should not have thrown');
      }
    });
  });
});
