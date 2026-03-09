import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { EmailConfiguration, Offer, User } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';
import { EmailSenderService, SmtpConfig } from '@accounting/email';

import { SendOfferDto } from '../dto/offer.dto';
import {
  EmailConfigurationMissingException,
  EmailSendFailedException,
} from '../exceptions/offer.exception';

@Injectable()
export class OfferEmailService {
  private readonly logger = new Logger(OfferEmailService.name);

  constructor(
    @InjectRepository(EmailConfiguration)
    private readonly emailConfigRepository: Repository<EmailConfiguration>,
    private readonly emailSenderService: EmailSenderService,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * Gets the email configuration for a company and builds SMTP config
   */
  private async getSmtpConfig(
    companyId: string
  ): Promise<{ smtpConfig: SmtpConfig; fromEmail: string }> {
    const config = await this.emailConfigRepository.findOne({
      where: { companyId },
    });

    if (!config) {
      throw new EmailConfigurationMissingException();
    }

    // Decrypt the password
    const decryptedPassword = await this.encryptionService.decrypt(config.smtpPassword);

    const smtpConfig: SmtpConfig = {
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: decryptedPassword,
      },
    };

    return { smtpConfig, fromEmail: config.smtpUser };
  }

  /**
   * Builds the default email subject
   */
  private buildDefaultSubject(offer: Offer): string {
    return `Oferta ${offer.offerNumber} - ${offer.title}`;
  }

  /**
   * Builds the default email body
   */
  private buildDefaultBody(offer: Offer): string {
    const recipientName = offer.recipientSnapshot.contactPerson || offer.recipientSnapshot.name;
    const formattedDate = new Date(offer.validUntil).toLocaleDateString('pl-PL');

    return `Szanowny/a ${recipientName},

Przesyłamy ofertę ${offer.offerNumber} dotyczącą "${offer.title}".

Oferta jest ważna do ${formattedDate}.

W razie pytań pozostajemy do dyspozycji.

Z poważaniem,
Zespół księgowości`;
  }

  /**
   * Sends an offer via email
   */
  async sendOffer(
    offer: Offer,
    dto: SendOfferDto,
    user: User
  ): Promise<{ success: boolean; sentAt: Date }> {
    try {
      // Get SMTP configuration
      const { smtpConfig, fromEmail } = await this.getSmtpConfig(offer.companyId);

      // Prepare email content
      const subject = dto.subject || this.buildDefaultSubject(offer);
      const body = dto.body || this.buildDefaultBody(offer);

      // Send email using EmailSenderService
      await this.emailSenderService.sendEmail(smtpConfig, {
        to: dto.email,
        cc: dto.cc,
        subject,
        html: body.replace(/\n/g, '<br>'),
        text: body,
        from: fromEmail,
      });

      const sentAt = new Date();

      this.logger.log(`Offer ${offer.offerNumber} sent to ${dto.email} by user ${user.id}`);

      return { success: true, sentAt };
    } catch (error) {
      this.logger.error(`Failed to send offer ${offer.offerNumber}`, error);

      if (error instanceof EmailConfigurationMissingException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      throw new EmailSendFailedException(message);
    }
  }

  /**
   * Returns eligibility status for sending an email for an offer
   */
  async getSendEligibility(offer: Offer): Promise<{ canSend: boolean; reason?: string }> {
    try {
      await this.getSmtpConfig(offer.companyId);
    } catch {
      return {
        canSend: false,
        reason: 'Konfiguracja email nie została ustawiona',
      };
    }

    return { canSend: true };
  }
}
