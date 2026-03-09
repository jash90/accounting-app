import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationType, type ClientSuspension } from '@accounting/common';

import { SuspensionReminderService } from './suspension-reminder.service';

describe('SuspensionReminderService', () => {
  let service: SuspensionReminderService;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-123';

  const makeSuspension = (
    id: string,
    overrides: Partial<ClientSuspension> = {}
  ): ClientSuspension =>
    ({
      id,
      clientId: mockClientId,
      companyId: mockCompanyId,
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-06-15'),
      client: { name: 'Test Client' },
      ...overrides,
    }) as ClientSuspension;

  const mockSuspensionService = {
    getSuspensionsFor7DayStartReminder: jest.fn(),
    getSuspensionsFor1DayStartReminder: jest.fn(),
    getSuspensionsFor7DayEndReminder: jest.fn(),
    getSuspensionsFor1DayEndReminder: jest.fn(),
    getSuspensionsForResumptionNotification: jest.fn(),
    markReminderSent: jest.fn(),
    getCompanyEmployees: jest.fn(),
    getCompanyOwners: jest.fn(),
  };

  const mockNotificationDispatcher = {
    dispatch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SuspensionReminderService,
          useFactory: () =>
            new SuspensionReminderService(
              mockSuspensionService as any,
              mockNotificationDispatcher as any
            ),
        },
      ],
    }).compile();

    service = module.get<SuspensionReminderService>(SuspensionReminderService);
  });

  describe('checkSuspensionReminders', () => {
    it('should run all five reminder checks in parallel', async () => {
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);

      await service.checkSuspensionReminders();

      expect(mockSuspensionService.getSuspensionsFor7DayStartReminder).toHaveBeenCalled();
      expect(mockSuspensionService.getSuspensionsFor1DayStartReminder).toHaveBeenCalled();
      expect(mockSuspensionService.getSuspensionsFor7DayEndReminder).toHaveBeenCalled();
      expect(mockSuspensionService.getSuspensionsFor1DayEndReminder).toHaveBeenCalled();
      expect(mockSuspensionService.getSuspensionsForResumptionNotification).toHaveBeenCalled();
    });

    it('should send 7-day start reminders to employees', async () => {
      const suspension = makeSuspension('susp-1');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);

      await service.checkSuspensionReminders();

      expect(mockSuspensionService.markReminderSent).toHaveBeenCalledWith(
        'susp-1',
        'startDate7DayReminderSent'
      );
      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_SUSPENSION_START_REMINDER_7D,
          recipientIds: ['emp-1'],
          companyId: mockCompanyId,
        })
      );
    });

    it('should send 1-day start reminders to employees', async () => {
      const suspension = makeSuspension('susp-2');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);

      await service.checkSuspensionReminders();

      expect(mockSuspensionService.markReminderSent).toHaveBeenCalledWith(
        'susp-2',
        'startDate1DayReminderSent'
      );
    });

    it('should send 7-day end reminders to employees', async () => {
      const suspension = makeSuspension('susp-3');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);

      await service.checkSuspensionReminders();

      expect(mockSuspensionService.markReminderSent).toHaveBeenCalledWith(
        'susp-3',
        'endDate7DayReminderSent'
      );
    });

    it('should send resumption notifications to company owners', async () => {
      const suspension = makeSuspension('susp-5');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([suspension]);
      mockSuspensionService.getCompanyOwners.mockResolvedValue([{ id: 'owner-1' }]);

      await service.checkSuspensionReminders();

      expect(mockSuspensionService.markReminderSent).toHaveBeenCalledWith(
        'susp-5',
        'resumptionNotificationSent'
      );
      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_RESUMED,
          recipientIds: ['owner-1'],
        })
      );
    });

    it('should not send notifications when no suspensions found', async () => {
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);

      await service.checkSuspensionReminders();

      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
      expect(mockSuspensionService.markReminderSent).not.toHaveBeenCalled();
    });

    it('should skip notification dispatch when no employees found', async () => {
      const suspension = makeSuspension('susp-6');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([]);

      await service.checkSuspensionReminders();

      // Reminder still marked as sent to prevent duplicates
      expect(mockSuspensionService.markReminderSent).toHaveBeenCalled();
      // But no notification dispatched
      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should mark reminder as sent before sending to prevent duplicates on failure', async () => {
      const suspension = makeSuspension('susp-7');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);
      mockNotificationDispatcher.dispatch.mockRejectedValue(new Error('Dispatch failed'));

      // Should not throw even when dispatch fails
      await service.checkSuspensionReminders();

      expect(mockSuspensionService.markReminderSent).toHaveBeenCalledWith(
        'susp-7',
        'startDate7DayReminderSent'
      );
    });

    it('should handle errors in fetching suspensions gracefully', async () => {
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockRejectedValue(
        new Error('DB error')
      );
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);

      // Should not throw
      await expect(service.checkSuspensionReminders()).resolves.toBeUndefined();
    });

    it('should send 1-day end reminders with correct notification type', async () => {
      const suspension = makeSuspension('susp-8');
      mockSuspensionService.getSuspensionsFor7DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayStartReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor7DayEndReminder.mockResolvedValue([]);
      mockSuspensionService.getSuspensionsFor1DayEndReminder.mockResolvedValue([suspension]);
      mockSuspensionService.getSuspensionsForResumptionNotification.mockResolvedValue([]);
      mockSuspensionService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);

      await service.checkSuspensionReminders();

      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_SUSPENSION_END_REMINDER_1D,
        })
      );
    });
  });
});
