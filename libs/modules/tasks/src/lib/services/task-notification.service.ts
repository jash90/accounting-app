
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { Repository } from 'typeorm';

import {
  Client,
  Company,
  NotificationSettings,
  Task,
  TaskPriority,
  TaskPriorityLabels,
  TaskStatus,
  TaskStatusLabels,
  User,
} from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';

interface ChangeDetail {
  fieldLabel: string;
  oldValue: string;
  newValue: string;
}

@Injectable()
export class TaskNotificationService {
  private readonly logger = new Logger(TaskNotificationService.name);
  private readonly moduleSlug = 'tasks';

  // Use process.cwd() for reliable path resolution in webpack bundles
  private readonly templatesDir = path.resolve(
    process.cwd(),
    'libs',
    'infrastructure',
    'email',
    'src',
    'lib',
    'templates'
  );

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly notificationSettingsRepository: Repository<NotificationSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSenderService: EmailSenderService
  ) {}

  /**
   * Send notification when a task with clientId is created
   */
  async notifyTaskCreated(task: Task, performedBy: User): Promise<void> {
    // Only notify for tasks associated with a client
    if (!task.clientId) {
      return;
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      task.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        'No active email configuration for company. Skipping task create notifications.',
        {
          companyId: task.companyId,
          taskId: task.id,
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(task.companyId, 'receiveOnCreate');

    if (recipients.length === 0) {
      return;
    }

    const [company, client] = await Promise.all([
      this.companyRepository.findOne({ where: { id: task.companyId } }),
      this.clientRepository.findOne({ where: { id: task.clientId } }),
    ]);

    try {
      const html = await this.compileTemplate('task-created', {
        taskTitle: task.title,
        clientName: client?.name,
        statusLabel: TaskStatusLabels[task.status],
        priorityLabel: TaskPriorityLabels[task.priority],
        assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
        dueDate: this.formatDatePolish(task.dueDate),
        companyName: company?.name || 'Nieznana firma',
        performedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        createdAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Nowe zadanie: ${task.title}${client ? ` (${client.name})` : ''}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log('Task created notifications sent', {
        companyId: task.companyId,
        taskId: task.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send task created notification', {
        companyId: task.companyId,
        taskId: task.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send notification when a task with clientId is updated
   */
  async notifyTaskUpdated(
    task: Task,
    oldValues: Record<string, unknown>,
    performedBy: User,
    oldClientId?: string
  ): Promise<void> {
    // Notify for tasks currently or previously associated with a client
    const currentClientId = task.clientId;
    const _clientIdChanged = oldClientId !== currentClientId;

    if (!currentClientId && !oldClientId) {
      return;
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      task.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        'No active email configuration for company. Skipping task update notifications.',
        {
          companyId: task.companyId,
          taskId: task.id,
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(task.companyId, 'receiveOnUpdate');

    if (recipients.length === 0) {
      return;
    }

    // Calculate changes
    const changes = this.calculateChanges(oldValues, task);

    if (changes.length === 0) {
      return;
    }

    const [company, client] = await Promise.all([
      this.companyRepository.findOne({ where: { id: task.companyId } }),
      currentClientId
        ? this.clientRepository.findOne({ where: { id: currentClientId } })
        : oldClientId
          ? this.clientRepository.findOne({ where: { id: oldClientId } })
          : null,
    ]);

    try {
      const html = await this.compileTemplate('task-updated', {
        taskTitle: task.title,
        clientName: client?.name,
        changes,
        companyName: company?.name || 'Nieznana firma',
        performedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        updatedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Zadanie zaktualizowane: ${task.title}${client ? ` (${client.name})` : ''}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log('Task updated notifications sent', {
        companyId: task.companyId,
        taskId: task.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send task updated notification', {
        companyId: task.companyId,
        taskId: task.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send notification when a task with clientId is deleted
   */
  async notifyTaskDeleted(task: Task, performedBy: User): Promise<void> {
    // Only notify for tasks associated with a client
    if (!task.clientId) {
      return;
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      task.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        'No active email configuration for company. Skipping task delete notifications.',
        {
          companyId: task.companyId,
          taskId: task.id,
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(task.companyId, 'receiveOnDelete');

    if (recipients.length === 0) {
      return;
    }

    const [company, client] = await Promise.all([
      this.companyRepository.findOne({ where: { id: task.companyId } }),
      this.clientRepository.findOne({ where: { id: task.clientId } }),
    ]);

    try {
      const html = await this.compileTemplate('task-deleted', {
        taskTitle: task.title,
        clientName: client?.name,
        statusLabel: TaskStatusLabels[task.status],
        priorityLabel: TaskPriorityLabels[task.priority],
        assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
        companyName: company?.name || 'Nieznana firma',
        performedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        deletedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Zadanie usunięte: ${task.title}${client ? ` (${client.name})` : ''}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log('Task deleted notifications sent', {
        companyId: task.companyId,
        taskId: task.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send task deleted notification', {
        companyId: task.companyId,
        taskId: task.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send notification when a task with clientId is completed (status changed to DONE)
   */
  async notifyTaskCompleted(task: Task, performedBy: User): Promise<void> {
    // Only notify for tasks associated with a client
    if (!task.clientId) {
      return;
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      task.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        'No active email configuration for company. Skipping task completed notifications.',
        {
          companyId: task.companyId,
          taskId: task.id,
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(
      task.companyId,
      'receiveOnTaskCompleted'
    );

    if (recipients.length === 0) {
      return;
    }

    const [company, client] = await Promise.all([
      this.companyRepository.findOne({ where: { id: task.companyId } }),
      this.clientRepository.findOne({ where: { id: task.clientId } }),
    ]);

    try {
      const html = await this.compileTemplate('task-completed', {
        taskTitle: task.title,
        clientName: client?.name,
        priorityLabel: TaskPriorityLabels[task.priority],
        assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
        dueDate: this.formatDatePolish(task.dueDate),
        companyName: company?.name || 'Nieznana firma',
        performedByName: `${performedBy.firstName} ${performedBy.lastName}`,
        completedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Zadanie zakończone: ${task.title}${client ? ` (${client.name})` : ''}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log('Task completed notifications sent', {
        companyId: task.companyId,
        taskId: task.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send task completed notification', {
        companyId: task.companyId,
        taskId: task.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send notification when a task with clientId becomes overdue
   */
  async notifyTaskOverdue(task: Task): Promise<void> {
    // Only notify for tasks associated with a client
    if (!task.clientId) {
      return;
    }

    const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
      task.companyId
    );

    if (!smtpConfig) {
      this.logger.warn(
        'No active email configuration for company. Skipping task overdue notifications.',
        {
          companyId: task.companyId,
          taskId: task.id,
        }
      );
      return;
    }

    const recipients = await this.getNotificationRecipients(task.companyId, 'receiveOnTaskOverdue');

    if (recipients.length === 0) {
      return;
    }

    const [company, client] = await Promise.all([
      this.companyRepository.findOne({ where: { id: task.companyId } }),
      this.clientRepository.findOne({ where: { id: task.clientId } }),
    ]);

    try {
      const html = await this.compileTemplate('task-overdue', {
        taskTitle: task.title,
        clientName: client?.name,
        statusLabel: TaskStatusLabels[task.status],
        priorityLabel: TaskPriorityLabels[task.priority],
        assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
        dueDate: this.formatDatePolish(task.dueDate),
        companyName: company?.name || 'Nieznana firma',
        detectedAt: new Date().toLocaleString('pl-PL'),
      });

      const messages = recipients.map((recipient) => ({
        to: recipient.email,
        subject: `Zadanie przeterminowane: ${task.title}${client ? ` (${client.name})` : ''}`,
        html,
      }));

      await this.emailSenderService.sendBatchEmails(smtpConfig, messages);
      this.logger.log('Task overdue notifications sent', {
        companyId: task.companyId,
        taskId: task.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send task overdue notification', {
        companyId: task.companyId,
        taskId: task.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get users who should receive notifications
   * Users WITHOUT settings → receive notifications (default enabled)
   * Users with [notificationType] = true → receive notifications
   * Users with [notificationType] = false → DO NOT receive notifications
   */
  private async getNotificationRecipients(
    companyId: string,
    notificationType:
      | 'receiveOnCreate'
      | 'receiveOnUpdate'
      | 'receiveOnDelete'
      | 'receiveOnTaskCompleted'
      | 'receiveOnTaskOverdue'
  ): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoin(
        NotificationSettings,
        'settings',
        'settings.userId = user.id AND settings.companyId = :companyId AND settings.moduleSlug = :moduleSlug',
        { companyId, moduleSlug: this.moduleSlug }
      )
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.isActive = :isActive', { isActive: true });

    // No settings (NULL) = default enabled, OR explicitly enabled
    queryBuilder.andWhere(`(settings.id IS NULL OR settings.${notificationType} = :enabled)`, {
      enabled: true,
    });

    return queryBuilder.getMany();
  }

  private calculateChanges(oldValues: Record<string, unknown>, newTask: Task): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    const fieldLabels: Record<string, string> = {
      title: 'Tytuł',
      description: 'Opis',
      status: 'Status',
      priority: 'Priorytet',
      dueDate: 'Termin',
      startDate: 'Data rozpoczęcia',
      estimatedMinutes: 'Estymowany czas',
      storyPoints: 'Story points',
      assigneeId: 'Przypisanie',
      clientId: 'Klient',
    };

    const fieldsToCompare = Object.keys(fieldLabels);

    for (const field of fieldsToCompare) {
      const oldValue = oldValues[field];
      const newValue = (newTask as unknown as Record<string, unknown>)[field];

      if (this.hasChanged(oldValue, newValue)) {
        changes.push({
          fieldLabel: fieldLabels[field],
          oldValue: this.formatValue(field, oldValue),
          newValue: this.formatValue(field, newValue),
        });
      }
    }

    return changes;
  }

  private hasChanged(oldValue: unknown, newValue: unknown): boolean {
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }

    if (oldValue == null && newValue == null) {
      return false;
    }

    // Handle Date strings
    // eslint-disable-next-line security/detect-unsafe-regex -- Linear pattern, no backtracking risk
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    if (
      typeof oldValue === 'string' &&
      typeof newValue === 'string' &&
      isoDatePattern.test(oldValue) &&
      isoDatePattern.test(newValue)
    ) {
      return new Date(oldValue).getTime() !== new Date(newValue).getTime();
    }

    return oldValue !== newValue;
  }

  private formatValue(field: string, value: unknown): string {
    if (value == null) {
      return '-';
    }

    if (field === 'status' && typeof value === 'string') {
      return TaskStatusLabels[value as TaskStatus] || value;
    }

    if (field === 'priority' && typeof value === 'string') {
      return TaskPriorityLabels[value as TaskPriority] || value;
    }

    if (field === 'dueDate' || field === 'startDate') {
      return this.formatDatePolish(value as Date | string) || '-';
    }

    if (field === 'estimatedMinutes' && typeof value === 'number') {
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      if (hours === 0) return `${mins} min`;
      if (mins === 0) return `${hours} godz`;
      return `${hours} godz ${mins} min`;
    }

    return String(value);
  }

  private async compileTemplate(
    templateName: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error('Failed to compile template', {
        templateName,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private formatDatePolish(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
