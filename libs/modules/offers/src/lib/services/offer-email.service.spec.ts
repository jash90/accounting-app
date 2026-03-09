import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { EmailConfiguration, type Offer, OfferStatus, type User } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { OfferEmailService } from './offer-email.service';
import {
  EmailConfigurationMissingException,
  EmailSendFailedException,
} from '../exceptions/offer.exception';

describe('OfferEmailService', () => {
  let service: OfferEmailService;
  let emailConfigRepository: jest.Mocked<Repository<EmailConfiguration>>;
  let emailSenderService: Record<string, jest.Mock>;
  let encryptionService: Record<string, jest.Mock>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  const mockOffer = {
    id: 'offer-1',
    companyId,
    offerNumber: 'OF/2026/001',
    title: 'Usługi księgowe',
    validUntil: new Date('2026-06-30'),
    recipientSnapshot: {
      name: 'Firma ABC',
      contactPerson: 'Jan Kowalski',
    },
    status: OfferStatus.DRAFT,
  } as unknown as Offer;

  const mockEmailConfig = {
    companyId,
    smtpHost: 'smtp.test.pl',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'user@test.pl',
    smtpPassword: 'encrypted-password',
  } as unknown as EmailConfiguration;

  beforeEach(async () => {
    jest.clearAllMocks();

    emailConfigRepository = {
      findOne: jest.fn().mockResolvedValue(mockEmailConfig),
    } as unknown as jest.Mocked<Repository<EmailConfiguration>>;

    emailSenderService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    encryptionService = {
      decrypt: jest.fn().mockResolvedValue('decrypted-password'),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: OfferEmailService,
          useFactory: () =>
            new OfferEmailService(
              emailConfigRepository as any,
              emailSenderService as any,
              encryptionService as any
            ),
        },
        { provide: getRepositoryToken(EmailConfiguration), useValue: emailConfigRepository },
        { provide: 'EmailSenderService', useValue: emailSenderService },
        { provide: EncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get(OfferEmailService);
  });

  describe('sendOffer', () => {
    it('should send email with default subject and body when not provided', async () => {
      const dto = { email: 'client@test.pl' } as any;

      const result = await service.sendOffer(mockOffer, dto, mockUser);

      expect(result.success).toBe(true);
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(emailSenderService.sendEmail).toHaveBeenCalledTimes(1);

      const callArgs = emailSenderService.sendEmail.mock.calls[0];
      // First arg is SMTP config
      expect(callArgs[0]).toEqual({
        host: 'smtp.test.pl',
        port: 587,
        secure: false,
        auth: { user: 'user@test.pl', pass: 'decrypted-password' },
      });
      // Second arg is email options
      expect(callArgs[1].to).toBe('client@test.pl');
      expect(callArgs[1].subject).toContain('OF/2026/001');
      expect(callArgs[1].from).toBe('user@test.pl');
    });

    it('should use custom subject and body when provided', async () => {
      const dto = {
        email: 'client@test.pl',
        subject: 'Custom Subject',
        body: 'Custom body text',
      } as any;

      await service.sendOffer(mockOffer, dto, mockUser);

      const callArgs = emailSenderService.sendEmail.mock.calls[0];
      expect(callArgs[1].subject).toBe('Custom Subject');
      expect(callArgs[1].text).toBe('Custom body text');
    });

    it('should throw EmailConfigurationMissingException when no config found', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);
      const dto = { email: 'client@test.pl' } as any;

      await expect(service.sendOffer(mockOffer, dto, mockUser)).rejects.toThrow(
        EmailConfigurationMissingException
      );
    });

    it('should throw EmailSendFailedException on transport error', async () => {
      emailSenderService.sendEmail.mockRejectedValue(new Error('Connection refused'));
      const dto = { email: 'client@test.pl' } as any;

      await expect(service.sendOffer(mockOffer, dto, mockUser)).rejects.toThrow(
        EmailSendFailedException
      );
    });

    it('should include cc recipients when provided', async () => {
      const dto = { email: 'client@test.pl', cc: 'boss@test.pl' } as any;

      await service.sendOffer(mockOffer, dto, mockUser);

      const callArgs = emailSenderService.sendEmail.mock.calls[0];
      expect(callArgs[1].cc).toBe('boss@test.pl');
    });
  });

  describe('getSendEligibility', () => {
    it('should return canSend: true when email config exists', async () => {
      const result = await service.getSendEligibility(mockOffer);

      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return canSend: false when email config is missing', async () => {
      emailConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getSendEligibility(mockOffer);

      expect(result.canSend).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
