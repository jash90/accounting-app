import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { CustomFieldReminder, NotificationType, User } from '@accounting/common';

import { CustomFieldReminderService } from './custom-field-reminder.service';

describe('CustomFieldReminderService', () => {
  let service: CustomFieldReminderService;
  let _reminderRepository: jest.Mocked<Repository<CustomFieldReminder>>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-123';
  const mockFieldDefId = 'field-def-123';
  const mockFieldValueId = 'field-val-123';
  const mockReminderId = 'reminder-123';

  const mockReminder: Partial<CustomFieldReminder> = {
    id: mockReminderId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    fieldDefinitionId: mockFieldDefId,
    fieldValueId: mockFieldValueId,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-01'),
    endDate7DayReminderSent: false,
    endDate1DayReminderSent: false,
    client: { name: 'Test Client' } as any,
    fieldDefinition: { name: 'Insurance Expiry' } as any,
  };

  const mockReminderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
  };

  const mockNotificationDispatcher = {
    dispatch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CustomFieldReminderService,
          useFactory: () =>
            new CustomFieldReminderService(
              mockReminderRepository as any,
              mockUserRepository as any,
              mockNotificationDispatcher as any
            ),
        },
        {
          provide: getRepositoryToken(CustomFieldReminder),
          useValue: mockReminderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<CustomFieldReminderService>(CustomFieldReminderService);
    _reminderRepository = module.get(getRepositoryToken(CustomFieldReminder));
  });

  describe('upsertReminder', () => {
    it('should create a new reminder when none exists', async () => {
      mockReminderRepository.findOne.mockResolvedValue(null);
      mockReminderRepository.create.mockReturnValue(mockReminder);
      mockReminderRepository.save.mockResolvedValue(mockReminder);

      const result = await service.upsertReminder(
        mockCompanyId,
        mockClientId,
        mockFieldDefId,
        mockFieldValueId,
        new Date('2026-01-01'),
        new Date('2026-06-01')
      );

      expect(result).toEqual(mockReminder);
      expect(mockReminderRepository.create).toHaveBeenCalled();
    });

    it('should update an existing reminder and reset notification flags', async () => {
      const existing = {
        ...mockReminder,
        endDate7DayReminderSent: true,
        endDate1DayReminderSent: true,
      };
      mockReminderRepository.findOne.mockResolvedValue(existing);
      mockReminderRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const newEnd = new Date('2026-09-01');
      const result = await service.upsertReminder(
        mockCompanyId,
        mockClientId,
        mockFieldDefId,
        mockFieldValueId,
        new Date('2026-01-01'),
        newEnd
      );

      expect(result.endDate).toEqual(newEnd);
      expect(result.endDate7DayReminderSent).toBe(false);
      expect(result.endDate1DayReminderSent).toBe(false);
      expect(mockReminderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteReminder', () => {
    it('should delete reminder by fieldValueId', async () => {
      mockReminderRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteReminder(mockFieldValueId);

      expect(mockReminderRepository.delete).toHaveBeenCalledWith({
        fieldValueId: mockFieldValueId,
      });
    });
  });

  describe('markReminderSent', () => {
    it('should mark 7-day reminder as sent', async () => {
      mockReminderRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markReminderSent(mockReminderId, 'endDate7DayReminderSent');

      expect(mockReminderRepository.update).toHaveBeenCalledWith(mockReminderId, {
        endDate7DayReminderSent: true,
      });
    });

    it('should mark 1-day reminder as sent', async () => {
      mockReminderRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markReminderSent(mockReminderId, 'endDate1DayReminderSent');

      expect(mockReminderRepository.update).toHaveBeenCalledWith(mockReminderId, {
        endDate1DayReminderSent: true,
      });
    });
  });

  describe('checkCustomFieldReminders', () => {
    it('should send 7-day end reminders when matching reminders found', async () => {
      mockReminderRepository.find
        .mockResolvedValueOnce([mockReminder as CustomFieldReminder]) // 7-day
        .mockResolvedValueOnce([]); // 1-day
      mockUserRepository.find
        .mockResolvedValueOnce([{ id: 'emp-1' }]) // employees
        .mockResolvedValueOnce([{ id: 'owner-1' }]); // owners

      await service.checkCustomFieldReminders();

      expect(mockReminderRepository.update).toHaveBeenCalledWith(mockReminderId, {
        endDate7DayReminderSent: true,
      });
      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_CUSTOM_FIELD_REMINDER_7D,
          companyId: mockCompanyId,
        })
      );
    });

    it('should send 1-day end reminders when matching reminders found', async () => {
      mockReminderRepository.find
        .mockResolvedValueOnce([]) // 7-day
        .mockResolvedValueOnce([mockReminder as CustomFieldReminder]); // 1-day
      mockUserRepository.find
        .mockResolvedValueOnce([{ id: 'emp-1' }])
        .mockResolvedValueOnce([{ id: 'owner-1' }]);

      await service.checkCustomFieldReminders();

      expect(mockReminderRepository.update).toHaveBeenCalledWith(mockReminderId, {
        endDate1DayReminderSent: true,
      });
      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_CUSTOM_FIELD_REMINDER_1D,
        })
      );
    });

    it('should not send notifications when no reminders found', async () => {
      mockReminderRepository.find.mockResolvedValue([]);

      await service.checkCustomFieldReminders();

      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should deduplicate user IDs between employees and owners', async () => {
      mockReminderRepository.find
        .mockResolvedValueOnce([mockReminder as CustomFieldReminder])
        .mockResolvedValueOnce([]);
      // Same user appears as both employee and owner
      mockUserRepository.find
        .mockResolvedValueOnce([{ id: 'user-1' }, { id: 'user-2' }])
        .mockResolvedValueOnce([{ id: 'user-1' }]);

      await service.checkCustomFieldReminders();

      const dispatchCall = mockNotificationDispatcher.dispatch.mock.calls[0][0];
      // Should deduplicate: user-1 appears only once
      expect(dispatchCall.recipientIds).toHaveLength(2);
      expect(dispatchCall.recipientIds).toContain('user-1');
      expect(dispatchCall.recipientIds).toContain('user-2');
    });

    it('should skip notification when no users found', async () => {
      mockReminderRepository.find
        .mockResolvedValueOnce([mockReminder as CustomFieldReminder])
        .mockResolvedValueOnce([]);
      mockUserRepository.find.mockResolvedValue([]);

      await service.checkCustomFieldReminders();

      expect(mockReminderRepository.update).toHaveBeenCalled(); // marked as sent
      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should handle dispatch errors gracefully', async () => {
      mockReminderRepository.find
        .mockResolvedValueOnce([mockReminder as CustomFieldReminder])
        .mockResolvedValueOnce([]);
      mockUserRepository.find.mockResolvedValueOnce([{ id: 'emp-1' }]).mockResolvedValueOnce([]);
      mockNotificationDispatcher.dispatch.mockRejectedValue(new Error('Dispatch failed'));

      // Should not throw
      await expect(service.checkCustomFieldReminders()).resolves.toBeUndefined();
    });
  });
});
