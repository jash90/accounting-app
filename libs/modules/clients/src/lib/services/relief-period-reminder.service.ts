import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClientReliefPeriod, NotificationType, ReliefTypeLabels } from '@accounting/common';
import { NotificationDispatcherService } from '@accounting/modules/notifications';

import { ReliefPeriodService } from './relief-period.service';

/**
 * Service responsible for sending relief period-related reminders via cron jobs.
 *
 * Notification schedule:
 * - 7 days before relief end → Reminder to employees and owner
 * - 1 day before relief end → Reminder to employees and owner
 */
@Injectable()
export class ReliefPeriodReminderService {
  private readonly logger = new Logger(ReliefPeriodReminderService.name);

  constructor(
    private readonly reliefPeriodService: ReliefPeriodService,
    private readonly notificationDispatcher: NotificationDispatcherService
  ) {}

  /**
   * Run daily at 8 AM Warsaw time to check for relief period reminders.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'Europe/Warsaw' })
  async checkReliefReminders(): Promise<void> {
    this.logger.log('Starting relief period reminder check');

    await Promise.all([this.send7DayEndReminders(), this.send1DayEndReminders()]);

    this.logger.log('Relief period reminder check completed');
  }

  /**
   * Send 7-day end reminders to employees and owner.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send7DayEndReminders(): Promise<void> {
    try {
      const reliefs = await this.reliefPeriodService.getReliefsFor7DayEndReminder();
      let sentCount = 0;

      for (const relief of reliefs) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.reliefPeriodService.markReminderSent(relief.id, 'endDate7DayReminderSent');

        try {
          await this.sendReminderToAllUsers(
            relief,
            NotificationType.CLIENT_RELIEF_END_REMINDER_7D,
            `Ulga "${this.getReliefLabel(relief)}" klienta "${relief.client.name}" kończy się za 7 dni`,
            `Ulga "${this.getReliefLabel(relief)}" dla klienta "${relief.client.name}" zakończy się ${this.formatDate(relief.endDate)}.`
          );
          sentCount++;
        } catch (notificationError) {
          // Log but don't throw - reminder marked to prevent duplicates
          this.logger.error('Failed to send 7-day relief end notification', {
            reliefId: relief.id,
            clientId: relief.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 7-day relief end reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 7-day relief end reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send 1-day end reminders to employees and owner.
   * Marks reminder as sent BEFORE sending to prevent duplicates on retry.
   */
  private async send1DayEndReminders(): Promise<void> {
    try {
      const reliefs = await this.reliefPeriodService.getReliefsFor1DayEndReminder();
      let sentCount = 0;

      for (const relief of reliefs) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.reliefPeriodService.markReminderSent(relief.id, 'endDate1DayReminderSent');

        try {
          await this.sendReminderToAllUsers(
            relief,
            NotificationType.CLIENT_RELIEF_END_REMINDER_1D,
            `Ulga "${this.getReliefLabel(relief)}" klienta "${relief.client.name}" kończy się jutro`,
            `Ulga "${this.getReliefLabel(relief)}" dla klienta "${relief.client.name}" zakończy się jutro (${this.formatDate(relief.endDate)}).`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 1-day relief end notification', {
            reliefId: relief.id,
            clientId: relief.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 1-day relief end reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 1-day relief end reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send reminder notification to all employees and owner of the company.
   */
  private async sendReminderToAllUsers(
    relief: ClientReliefPeriod,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    const [employees, owners] = await Promise.all([
      this.reliefPeriodService.getCompanyEmployees(relief.companyId),
      this.reliefPeriodService.getCompanyOwners(relief.companyId),
    ]);

    // Combine employees and owners, removing duplicates
    const allUserIds = new Set([...employees.map((e) => e.id), ...owners.map((o) => o.id)]);

    if (allUserIds.size === 0) {
      this.logger.debug('No users found for relief reminder notification', {
        companyId: relief.companyId,
        reliefId: relief.id,
      });
      return;
    }

    await this.notificationDispatcher.dispatch({
      type,
      recipientIds: Array.from(allUserIds),
      companyId: relief.companyId,
      title,
      message,
      data: {
        clientId: relief.clientId,
        clientName: relief.client.name,
        reliefId: relief.id,
        reliefType: relief.reliefType,
        reliefTypeLabel: this.getReliefLabel(relief),
        startDate: relief.startDate,
        endDate: relief.endDate,
      },
      actionUrl: `/modules/clients/${relief.clientId}`,
    });
  }

  /**
   * Get human-readable label for relief type.
   */
  private getReliefLabel(relief: ClientReliefPeriod): string {
    return ReliefTypeLabels[relief.reliefType] || relief.reliefType;
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
