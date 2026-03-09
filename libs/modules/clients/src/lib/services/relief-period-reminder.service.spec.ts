import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationType, ReliefType, type ClientReliefPeriod } from '@accounting/common';

import { ReliefPeriodReminderService } from './relief-period-reminder.service';

describe('ReliefPeriodReminderService', () => {
  let service: ReliefPeriodReminderService;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-123';

  const makeRelief = (
    id: string,
    overrides: Partial<ClientReliefPeriod> = {}
  ): ClientReliefPeriod =>
    ({
      id,
      clientId: mockClientId,
      companyId: mockCompanyId,
      reliefType: ReliefType.ULGA_NA_START,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-07-01'),
      isActive: true,
      client: { name: 'Test Client' },
      ...overrides,
    }) as ClientReliefPeriod;

  const mockReliefPeriodService = {
    getReliefsFor7DayEndReminder: jest.fn(),
    getReliefsFor1DayEndReminder: jest.fn(),
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
          provide: ReliefPeriodReminderService,
          useFactory: () =>
            new ReliefPeriodReminderService(
              mockReliefPeriodService as any,
              mockNotificationDispatcher as any
            ),
        },
      ],
    }).compile();

    service = module.get<ReliefPeriodReminderService>(ReliefPeriodReminderService);
  });

  describe('checkReliefReminders', () => {
    it('should process both 7-day and 1-day end reminders', async () => {
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);

      await service.checkReliefReminders();

      expect(mockReliefPeriodService.getReliefsFor7DayEndReminder).toHaveBeenCalled();
      expect(mockReliefPeriodService.getReliefsFor1DayEndReminder).toHaveBeenCalled();
    });

    it('should send 7-day end reminder to employees and owners', async () => {
      const relief = makeRelief('relief-1');
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([relief]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);
      mockReliefPeriodService.getCompanyOwners.mockResolvedValue([{ id: 'owner-1' }]);

      await service.checkReliefReminders();

      expect(mockReliefPeriodService.markReminderSent).toHaveBeenCalledWith(
        'relief-1',
        'endDate7DayReminderSent'
      );
      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_RELIEF_END_REMINDER_7D,
          recipientIds: expect.arrayContaining(['emp-1', 'owner-1']),
          companyId: mockCompanyId,
        })
      );
    });

    it('should send 1-day end reminder with correct notification type', async () => {
      const relief = makeRelief('relief-2');
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([relief]);
      mockReliefPeriodService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);
      mockReliefPeriodService.getCompanyOwners.mockResolvedValue([]);

      await service.checkReliefReminders();

      expect(mockNotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CLIENT_RELIEF_END_REMINDER_1D,
        })
      );
    });

    it('should not send notifications when no reliefs found', async () => {
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);

      await service.checkReliefReminders();

      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
      expect(mockReliefPeriodService.markReminderSent).not.toHaveBeenCalled();
    });

    it('should skip dispatch when no users found for company', async () => {
      const relief = makeRelief('relief-3');
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([relief]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getCompanyEmployees.mockResolvedValue([]);
      mockReliefPeriodService.getCompanyOwners.mockResolvedValue([]);

      await service.checkReliefReminders();

      expect(mockReliefPeriodService.markReminderSent).toHaveBeenCalled();
      expect(mockNotificationDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should handle dispatch errors gracefully without rethrowing', async () => {
      const relief = makeRelief('relief-4');
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([relief]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);
      mockReliefPeriodService.getCompanyEmployees.mockResolvedValue([{ id: 'emp-1' }]);
      mockReliefPeriodService.getCompanyOwners.mockResolvedValue([]);
      mockNotificationDispatcher.dispatch.mockRejectedValue(new Error('Network error'));

      await expect(service.checkReliefReminders()).resolves.toBeUndefined();
      expect(mockReliefPeriodService.markReminderSent).toHaveBeenCalled();
    });

    it('should deduplicate user IDs between employees and owners', async () => {
      const relief = makeRelief('relief-5');
      mockReliefPeriodService.getReliefsFor7DayEndReminder.mockResolvedValue([relief]);
      mockReliefPeriodService.getReliefsFor1DayEndReminder.mockResolvedValue([]);
      // Same user as both employee and owner
      mockReliefPeriodService.getCompanyEmployees.mockResolvedValue([{ id: 'user-1' }]);
      mockReliefPeriodService.getCompanyOwners.mockResolvedValue([{ id: 'user-1' }]);

      await service.checkReliefReminders();

      const dispatchCall = mockNotificationDispatcher.dispatch.mock.calls[0][0];
      expect(dispatchCall.recipientIds).toHaveLength(1);
      expect(dispatchCall.recipientIds).toContain('user-1');
    });
  });
});
