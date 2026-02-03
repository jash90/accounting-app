import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { CustomFieldReminder, NotificationType, User, UserRole } from '@accounting/common';
import { NotificationDispatcherService } from '@accounting/modules/notifications';

/**
 * Service responsible for sending custom field (DATE_RANGE_WITH_REMINDER) reminders via cron jobs.
 *
 * Notification schedule:
 * - 7 days before end date → Reminder to employees and owner
 * - 1 day before end date → Reminder to employees and owner
 */
@Injectable()
export class CustomFieldReminderService {
  private readonly logger = new Logger(CustomFieldReminderService.name);

  constructor(
    @InjectRepository(CustomFieldReminder)
    private readonly reminderRepository: Repository<CustomFieldReminder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationDispatcher: NotificationDispatcherService
  ) {}

  /**
   * Run daily at 8:15 AM Warsaw time to check for custom field reminders.
   * Offset by 15 minutes from other reminder cron jobs to reduce load.
   */
  @Cron('0 15 8 * * *', { timeZone: 'Europe/Warsaw' })
  async checkCustomFieldReminders(): Promise<void> {
    this.logger.log('Starting custom field reminder check');

    await Promise.all([this.send7DayEndReminders(), this.send1DayEndReminders()]);

    this.logger.log('Custom field reminder check completed');
  }

  /**
   * Create or update a reminder record for a custom field value.
   */
  async upsertReminder(
    companyId: string,
    clientId: string,
    fieldDefinitionId: string,
    fieldValueId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomFieldReminder> {
    let reminder = await this.reminderRepository.findOne({
      where: { fieldValueId },
    });

    if (reminder) {
      // Update existing reminder
      reminder.startDate = startDate;
      reminder.endDate = endDate;
      // Reset notification flags if endDate changed
      reminder.endDate7DayReminderSent = false;
      reminder.endDate1DayReminderSent = false;
    } else {
      // Create new reminder
      reminder = this.reminderRepository.create({
        companyId,
        clientId,
        fieldDefinitionId,
        fieldValueId,
        startDate,
        endDate,
      });
    }

    return this.reminderRepository.save(reminder);
  }

  /**
   * Delete a reminder record for a custom field value.
   */
  async deleteReminder(fieldValueId: string): Promise<void> {
    await this.reminderRepository.delete({ fieldValueId });
  }

  /**
   * Get reminders that need 7-day end notification.
   */
  async getRemindersFor7DayEndReminder(): Promise<CustomFieldReminder[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reminderRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate7DayReminderSent: false,
      },
      relations: ['client', 'fieldDefinition'],
    });
  }

  /**
   * Get reminders that need 1-day end notification.
   */
  async getRemindersFor1DayEndReminder(): Promise<CustomFieldReminder[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reminderRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate1DayReminderSent: false,
      },
      relations: ['client', 'fieldDefinition'],
    });
  }

  /**
   * Mark reminder as sent.
   */
  async markReminderSent(
    reminderId: string,
    reminderType: 'endDate7DayReminderSent' | 'endDate1DayReminderSent'
  ): Promise<void> {
    await this.reminderRepository.update(reminderId, {
      [reminderType]: true,
    });
  }

  /**
   * Send 7-day end reminders.
   */
  private async send7DayEndReminders(): Promise<void> {
    try {
      const reminders = await this.getRemindersFor7DayEndReminder();
      let sentCount = 0;

      for (const reminder of reminders) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.markReminderSent(reminder.id, 'endDate7DayReminderSent');

        try {
          await this.sendReminderToAllUsers(
            reminder,
            NotificationType.CLIENT_CUSTOM_FIELD_REMINDER_7D,
            `Przypomnienie: "${reminder.fieldDefinition.name}" dla klienta "${reminder.client.name}" - 7 dni`,
            `Pole "${reminder.fieldDefinition.name}" dla klienta "${reminder.client.name}" kończy się za 7 dni (${this.formatDate(reminder.endDate)}).`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 7-day custom field reminder', {
            reminderId: reminder.id,
            clientId: reminder.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 7-day custom field reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 7-day custom field reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send 1-day end reminders.
   */
  private async send1DayEndReminders(): Promise<void> {
    try {
      const reminders = await this.getRemindersFor1DayEndReminder();
      let sentCount = 0;

      for (const reminder of reminders) {
        // Mark as sent FIRST to prevent duplicates if notification fails
        await this.markReminderSent(reminder.id, 'endDate1DayReminderSent');

        try {
          await this.sendReminderToAllUsers(
            reminder,
            NotificationType.CLIENT_CUSTOM_FIELD_REMINDER_1D,
            `Przypomnienie: "${reminder.fieldDefinition.name}" dla klienta "${reminder.client.name}" - jutro`,
            `Pole "${reminder.fieldDefinition.name}" dla klienta "${reminder.client.name}" kończy się jutro (${this.formatDate(reminder.endDate)}).`
          );
          sentCount++;
        } catch (notificationError) {
          this.logger.error('Failed to send 1-day custom field reminder', {
            reminderId: reminder.id,
            clientId: reminder.clientId,
            error: (notificationError as Error).message,
          });
        }
      }

      if (sentCount > 0) {
        this.logger.log(`Sent ${sentCount} 1-day custom field reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to process 1-day custom field reminders', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send reminder notification to all employees and owner of the company.
   */
  private async sendReminderToAllUsers(
    reminder: CustomFieldReminder,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    const [employees, owners] = await Promise.all([
      this.getCompanyEmployees(reminder.companyId),
      this.getCompanyOwners(reminder.companyId),
    ]);

    // Combine employees and owners, removing duplicates
    const allUserIds = new Set([...employees.map((e) => e.id), ...owners.map((o) => o.id)]);

    if (allUserIds.size === 0) {
      this.logger.debug('No users found for custom field reminder notification', {
        companyId: reminder.companyId,
        reminderId: reminder.id,
      });
      return;
    }

    await this.notificationDispatcher.dispatch({
      type,
      recipientIds: Array.from(allUserIds),
      companyId: reminder.companyId,
      title,
      message,
      data: {
        clientId: reminder.clientId,
        clientName: reminder.client.name,
        fieldDefinitionId: reminder.fieldDefinitionId,
        fieldName: reminder.fieldDefinition.name,
        startDate: reminder.startDate,
        endDate: reminder.endDate,
      },
      actionUrl: `/modules/clients/${reminder.clientId}`,
    });
  }

  /**
   * Get employees for a company.
   */
  private async getCompanyEmployees(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        companyId,
        isActive: true,
        role: Not(UserRole.ADMIN),
      },
    });
  }

  /**
   * Get company owner(s).
   */
  private async getCompanyOwners(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        companyId,
        isActive: true,
        role: UserRole.COMPANY_OWNER,
      },
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
