
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import * as fs from 'fs/promises';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { Repository } from 'typeorm';

import { NotificationType, NotificationTypeLabels, User } from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';

import { NotificationService } from './notification.service';

interface EmailNotificationPayload {
  notificationId?: string;
  recipientId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  actorId?: string;
}

@Injectable()
export class EmailChannelService {
  private readonly logger = new Logger(EmailChannelService.name);
  private readonly templatesDir =
    process.env['NOTIFICATION_TEMPLATES_DIR'] || path.resolve(__dirname, '..', 'templates');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly emailSenderService: EmailSenderService,
    private readonly notificationService: NotificationService
  ) {}

  @OnEvent('notification.email.send')
  async handleEmailNotification(payload: EmailNotificationPayload): Promise<void> {
    try {
      const recipient = await this.userRepository.findOne({
        where: { id: payload.recipientId },
        select: ['id', 'email', 'firstName', 'lastName'],
      });

      if (!recipient) {
        this.logger.warn(`Recipient not found: ${payload.recipientId}`);
        return;
      }

      const smtpConfig = await this.emailConfigService.getDecryptedSmtpConfigByCompanyId(
        payload.companyId
      );

      if (!smtpConfig) {
        this.logger.warn(`No SMTP config for company ${payload.companyId}`);
        return;
      }

      let actor: { firstName: string; lastName: string } | null = null;
      if (payload.actorId) {
        const actorUser = await this.userRepository.findOne({
          where: { id: payload.actorId },
          select: ['firstName', 'lastName'],
        });
        if (actorUser) {
          actor = { firstName: actorUser.firstName, lastName: actorUser.lastName };
        }
      }

      const html = await this.compileTemplate(payload.type, {
        title: payload.title,
        message: payload.message,
        typeLabel: NotificationTypeLabels[payload.type],
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        actorName: actor ? `${actor.firstName} ${actor.lastName}` : null,
        actionUrl: payload.actionUrl,
        data: payload.data,
        timestamp: new Date().toLocaleString('pl-PL'),
      });

      await this.emailSenderService.sendEmail(smtpConfig, {
        to: recipient.email,
        subject: payload.title,
        html,
      });

      // Mark notification as email sent if we have the notification ID
      if (payload.notificationId) {
        await this.notificationService.markEmailSent(payload.notificationId);
      }

      this.logger.log(`Email notification sent to ${recipient.email}`, {
        type: payload.type,
        notificationId: payload.notificationId,
      });
    } catch (error) {
      this.logger.error(`Failed to send email notification`, {
        recipientId: payload.recipientId,
        type: payload.type,
        error: (error as Error).message,
      });
    }
  }

  private async compileTemplate(
    type: NotificationType,
    context: Record<string, unknown>
  ): Promise<string> {
    const templateName = type.includes('.bulk.') ? 'batch-notification' : 'single-notification';
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      await fs.access(templatePath);
    } catch {
      return this.getDefaultTemplate(context);
    }

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error('Failed to compile template', {
        templateName,
        error: (error as Error).message,
      });
      return this.getDefaultTemplate(context);
    }
  }

  private getDefaultTemplate(context: Record<string, unknown>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${context.title || 'Powiadomienie'}</h1>
          </div>
          <div class="content">
            <p>Witaj ${context.recipientName || ''},</p>
            ${context.message ? `<p>${context.message}</p>` : ''}
            ${context.actorName ? `<p>Akcja wykonana przez: ${context.actorName}</p>` : ''}
            ${context.actionUrl ? `<p><a href="${context.actionUrl}" class="button">Zobacz szczegóły</a></p>` : ''}
          </div>
          <div class="footer">
            <p>Ta wiadomość została wysłana automatycznie z systemu AppTax.</p>
            <p>${context.timestamp || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
