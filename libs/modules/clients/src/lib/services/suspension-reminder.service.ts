import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClientSuspension, NotificationType } from '@accounting/common';
import { NotificationDispatcherService } from '@accounting/modules/notifications';

import { SuspensionService } from './suspension.service';

/**
 * Service responsible for sending suspension-related reminders via cron jobs.
 *
 * Notification schedule:
 * - 7 days before suspension start → Reminder to employees
 * - 1 day before suspension start → Reminder to employees
 * - 7 days before suspension end → Reminder to employees
 * - 1 day before suspension end → Reminder to employees
 * - On suspension end date → Notification to company owner
 */
@Injectable()
export class SuspensionReminderService {
  private readonly logger = new Logger(SuspensionReminderService.name);

  constructor(
    private readonly suspensionService: SuspensionService,
    private readonly notificationDispatcher: NotificationDispatcherService
  ) {}

  /**
   * Run daily at 8 AM Warsaw time to check for suspension reminders.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'Europe/Warsaw' })
  async checkSuspensionReminders(): Promise<void> {
    this.logger.log('Starting suspension reminder check');

    await Promise.all([
      this.send7DayStartReminders(),
      this.send1DayStartReminders(),
      this.send7DayEndReminders(),
      this.send1DayEndReminders(),
      this.sendResumptionNotifications(),
    ]);

    this.logger.log('Suspension reminder check completed');
  }

  /**
   * Send 7-day start reminders to employees.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send7DayStartReminders(): Promise<void> {
    try {
      const suspensions = await this.suspensionService.getSuspensionsFor7DayStartReminder();
      let sentCount = 0;

      for (const suspension of suspensions) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.suspensionService.markReminderSent(suspension.id, 'startDate7DayReminderSent');

        try {
          await this.sendReminderToEmployees(
            suspension,
            NotificationType.CLIENT_SUSPENSION_START_REMINDER_7D,
            `Zawieszenie działalności klienta "${suspension.client.name}" rozpocznie się za 7 dni`,
            `Klient "${suspension.client.name}" będzie miał zawieszoną działalność od ${this.formatDate(suspension.startDate)}.`
          );
          sentCount++;
        } catch (notificationError) {
          // Log but don't throw - reminder marked to prevent duplicates
          this.logger.error('Failed to send 7-day start notification', {
            suspensionId: suspension.id,
            clientId: suspension.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 7-day start reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 7-day start reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send 1-day start reminders to employees.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send1DayStartReminders(): Promise<void> {
    try {
      const suspensions = await this.suspensionService.getSuspensionsFor1DayStartReminder();
      let sentCount = 0;

      for (const suspension of suspensions) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.suspensionService.markReminderSent(suspension.id, 'startDate1DayReminderSent');

        try {
          await this.sendReminderToEmployees(
            suspension,
            NotificationType.CLIENT_SUSPENSION_START_REMINDER_1D,
            `Zawieszenie działalności klienta "${suspension.client.name}" rozpocznie się jutro`,
            `Klient "${suspension.client.name}" będzie miał zawieszoną działalność od jutro (${this.formatDate(suspension.startDate)}).`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 1-day start notification', {
            suspensionId: suspension.id,
            clientId: suspension.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 1-day start reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 1-day start reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send 7-day end reminders to employees.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send7DayEndReminders(): Promise<void> {
    try {
      const suspensions = await this.suspensionService.getSuspensionsFor7DayEndReminder();
      let sentCount = 0;

      for (const suspension of suspensions) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.suspensionService.markReminderSent(suspension.id, 'endDate7DayReminderSent');

        try {
          await this.sendReminderToEmployees(
            suspension,
            NotificationType.CLIENT_SUSPENSION_END_REMINDER_7D,
            `Wznowienie działalności klienta "${suspension.client.name}" za 7 dni`,
            `Klient "${suspension.client.name}" wznowi działalność ${this.formatDate(suspension.endDate!)}.`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 7-day end notification', {
            suspensionId: suspension.id,
            clientId: suspension.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 7-day end reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 7-day end reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send 1-day end reminders to employees.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send1DayEndReminders(): Promise<void> {
    try {
      const suspensions = await this.suspensionService.getSuspensionsFor1DayEndReminder();
      let sentCount = 0;

      for (const suspension of suspensions) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.suspensionService.markReminderSent(suspension.id, 'endDate1DayReminderSent');

        try {
          await this.sendReminderToEmployees(
            suspension,
            NotificationType.CLIENT_SUSPENSION_END_REMINDER_1D,
            `Wznowienie działalności klienta "${suspension.client.name}" jutro`,
            `Klient "${suspension.client.name}" wznowi działalność jutro (${this.formatDate(suspension.endDate!)}).`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 1-day end notification', {
            suspensionId: suspension.id,
            clientId: suspension.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 1-day end reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 1-day end reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send resumption notifications to company owner.
   * Marks notification as sent BEFORE sending to prevent duplicates on retry.
   */
  private async sendResumptionNotifications(): Promise<void> {
    try {
      const suspensions = await this.suspensionService.getSuspensionsForResumptionNotification();
      let sentCount = 0;

      for (const suspension of suspensions) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.suspensionService.markReminderSent(suspension.id, 'resumptionNotificationSent');

        try {
          await this.sendNotificationToOwner(
            suspension,
            NotificationType.CLIENT_RESUMED,
            `Działalność klienta "${suspension.client.name}" została wznowiona`,
            `Klient "${suspension.client.name}" wznowił działalność. Okres zawieszenia: ${this.formatDate(suspension.startDate)} - ${this.formatDate(suspension.endDate!)}.`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send resumption notification', {
            suspensionId: suspension.id,
            clientId: suspension.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} resumption notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to process resumption notifications', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send reminder notification to all employees of the company.
   */
  private async sendReminderToEmployees(
    suspension: ClientSuspension,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    const employees = await this.suspensionService.getCompanyEmployees(suspension.companyId);

    if (employees.length === 0) {
      this.logger.debug('No employees found for reminder notification', {
        companyId: suspension.companyId,
        suspensionId: suspension.id,
      });
      return;
    }

    await this.notificationDispatcher.dispatch({
      type,
      recipientIds: employees.map((e) => e.id),
      companyId: suspension.companyId,
      title,
      message,
      data: {
        clientId: suspension.clientId,
        clientName: suspension.client.name,
        suspensionId: suspension.id,
        startDate: suspension.startDate,
        endDate: suspension.endDate,
      },
      actionUrl: `/modules/clients/${suspension.clientId}`,
    });
  }

  /**
   * Send notification to company owner(s).
   */
  private async sendNotificationToOwner(
    suspension: ClientSuspension,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    const owners = await this.suspensionService.getCompanyOwners(suspension.companyId);

    if (owners.length === 0) {
      this.logger.warn('No company owners found for resumption notification', {
        companyId: suspension.companyId,
        suspensionId: suspension.id,
      });
      return;
    }

    await this.notificationDispatcher.dispatch({
      type,
      recipientIds: owners.map((o) => o.id),
      companyId: suspension.companyId,
      title,
      message,
      data: {
        clientId: suspension.clientId,
        clientName: suspension.client.name,
        suspensionId: suspension.id,
        startDate: suspension.startDate,
        endDate: suspension.endDate,
      },
      actionUrl: `/modules/clients/${suspension.clientId}`,
    });
  }

  /**
   * Format date to Polish locale string.
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
