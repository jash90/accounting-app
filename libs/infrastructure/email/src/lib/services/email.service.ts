import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EmailOptions, EmailConfig } from '../interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly config: EmailConfig;
  private readonly templatesDir: string;

  constructor(private configService: ConfigService) {
    this.config = {
      enabled: this.configService.get<string>('SMTP_ENABLED', 'false') === 'true',
      host: this.configService.get<string>('SMTP_HOST', 'smtp.example.com'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
      from: this.configService.get<string>('SMTP_FROM', 'noreply@accounting.local'),
    };

    this.templatesDir = path.join(__dirname, '..', 'templates');

    this.registerHandlebarsHelpers();

    if (this.config.enabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email service is disabled. Set SMTP_ENABLED=true to enable.');
    }
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
    }
  }

  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.debug('Email not sent (disabled):', options.subject);
      return false;
    }

    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    try {
      let html = options.html;

      // If template is specified, compile it with Handlebars
      if (options.template && options.context) {
        html = await this.compileTemplate(options.template, options.context);
      }

      const mailOptions: nodemailer.SendMailOptions = {
        from: options.from || this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return false;
    }
  }

  private async compileTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to compile template: ${templateName}`, error);
      throw error;
    }
  }

  async sendClientCreatedNotification(
    recipients: string[],
    clientData: { name: string; nip?: string; companyName: string; createdByName: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `Nowy klient dodany: ${clientData.name}`,
      template: 'client-created',
      context: {
        clientName: clientData.name,
        clientNip: clientData.nip || 'Nie podano',
        companyName: clientData.companyName,
        createdByName: clientData.createdByName,
        createdAt: new Date().toLocaleString('pl-PL'),
      },
    });
  }

  async sendClientUpdatedNotification(
    recipients: string[],
    clientData: {
      name: string;
      companyName: string;
      updatedByName: string;
      changes: Array<{ field: string; oldValue: string; newValue: string }>;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `Klient zaktualizowany: ${clientData.name}`,
      template: 'client-updated',
      context: {
        clientName: clientData.name,
        companyName: clientData.companyName,
        updatedByName: clientData.updatedByName,
        updatedAt: new Date().toLocaleString('pl-PL'),
        changes: clientData.changes,
      },
    });
  }

  async sendClientDeletedNotification(
    recipients: string[],
    clientData: { name: string; nip?: string; companyName: string; deletedByName: string },
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `Klient usunięty: ${clientData.name}`,
      template: 'client-deleted',
      context: {
        clientName: clientData.name,
        clientNip: clientData.nip || 'Nie podano',
        companyName: clientData.companyName,
        deletedByName: clientData.deletedByName,
        deletedAt: new Date().toLocaleString('pl-PL'),
      },
    });
  }

  async sendUserCreatedNotification(
    recipients: string[],
    userData: {
      name: string;
      email: string;
      role: string;
      companyName: string;
      createdByName: string;
    },
    fromEmail?: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: recipients,
      subject: `Nowy użytkownik dodany: ${userData.name}`,
      from: fromEmail,
      template: 'user-created',
      context: {
        userName: userData.name,
        userEmail: userData.email,
        userRole: userData.role,
        companyName: userData.companyName,
        createdByName: userData.createdByName,
        createdAt: new Date().toLocaleString('pl-PL'),
      },
    });
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
