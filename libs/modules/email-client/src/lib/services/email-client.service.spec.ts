import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserRole, type User } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';
import {
  type EmailConfigurationService,
  type EmailReaderService,
  type EmailSenderService,
} from '@accounting/email';

import { EmailClientService } from './email-client.service';

describe('EmailClientService', () => {
  let service: EmailClientService;
  let emailReaderService: jest.Mocked<
    Pick<
      EmailReaderService,
      | 'fetchEmails'
      | 'fetchEmailsPaginated'
      | 'listMailboxes'
      | 'markAsSeen'
      | 'deleteEmails'
      | 'findTrashMailbox'
      | 'moveMessages'
      | 'updateFlags'
      | 'searchEmails'
      | 'fetchEmailAttachment'
    >
  >;
  let emailSenderService: jest.Mocked<Pick<EmailSenderService, 'sendEmailAndSave'>>;
  let emailConfigService: jest.Mocked<
    Pick<
      EmailConfigurationService,
      'getDecryptedSystemAdminEmailConfig' | 'getDecryptedEmailConfigByCompanyId'
    >
  >;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockImapConfig = {
    host: 'imap.test.com',
    port: 993,
    tls: true,
    user: 'test@test.com',
    password: 'pass',
  };
  const mockSmtpConfig = {
    host: 'smtp.test.com',
    port: 465,
    secure: true,
    auth: { user: 'test@test.com', pass: 'pass' },
  };
  const mockEmailConfig = { smtp: mockSmtpConfig, imap: mockImapConfig };

  const mockCompanyUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;
  const mockAdminUser = { id: 'admin-1', role: UserRole.ADMIN } as User;

  const mockEmail = {
    uid: 1,
    subject: 'Test',
    from: [{ name: 'Sender', address: 'sender@test.com' }],
    to: [{ name: 'Recipient', address: 'test@test.com' }],
    text: 'Hello',
    date: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    emailReaderService = {
      fetchEmails: jest.fn(),
      fetchEmailsPaginated: jest.fn(),
      listMailboxes: jest.fn(),
      markAsSeen: jest.fn(),
      deleteEmails: jest.fn(),
      findTrashMailbox: jest.fn(),
      moveMessages: jest.fn(),
      updateFlags: jest.fn(),
      searchEmails: jest.fn(),
      fetchEmailAttachment: jest.fn(),
    };

    emailSenderService = {
      sendEmailAndSave: jest.fn(),
    };

    emailConfigService = {
      getDecryptedSystemAdminEmailConfig: jest.fn(),
      getDecryptedEmailConfigByCompanyId: jest.fn(),
    };

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailClientService,
          useFactory: () =>
            new EmailClientService(
              emailReaderService as any,
              emailSenderService as any,
              emailConfigService as any,
              systemCompanyService as any
            ),
        },
      ],
    }).compile();

    service = module.get(EmailClientService);
  });

  describe('getInbox', () => {
    it('should fetch inbox emails for company user', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([mockEmail as any]);

      const result = await service.getInbox(mockCompanyUser);

      expect(result).toEqual([mockEmail]);
      expect(emailConfigService.getDecryptedEmailConfigByCompanyId).toHaveBeenCalledWith(companyId);
      expect(emailReaderService.fetchEmails).toHaveBeenCalledWith(mockImapConfig, {
        limit: 20,
        unseenOnly: undefined,
      });
    });

    it('should fetch inbox emails for admin user using system config', async () => {
      emailConfigService.getDecryptedSystemAdminEmailConfig.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([]);

      await service.getInbox(mockAdminUser);

      expect(emailConfigService.getDecryptedSystemAdminEmailConfig).toHaveBeenCalled();
    });

    it('should use provided options (limit, unseenOnly)', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([]);

      await service.getInbox(mockCompanyUser, { limit: 5, unseenOnly: true });

      expect(emailReaderService.fetchEmails).toHaveBeenCalledWith(mockImapConfig, {
        limit: 5,
        unseenOnly: true,
      });
    });

    it('should retry on IMAP command failure', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails
        .mockRejectedValueOnce(new Error('Command failed'))
        .mockResolvedValueOnce([mockEmail as any]);

      const result = await service.getInbox(mockCompanyUser);

      expect(result).toEqual([mockEmail]);
      expect(emailReaderService.fetchEmails).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when no email config for company', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(null);

      await expect(service.getInbox(mockCompanyUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when admin has no system config', async () => {
      emailConfigService.getDecryptedSystemAdminEmailConfig.mockResolvedValue(null);

      await expect(service.getInbox(mockAdminUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2', role: UserRole.EMPLOYEE } as User;
      systemCompanyService.getCompanyIdForUser.mockResolvedValue(null);

      await expect(service.getInbox(noCompanyUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFolder', () => {
    it('should fetch emails from specific folder', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([mockEmail as any]);

      const result = await service.getFolder(mockCompanyUser, 'Sent');

      expect(result).toEqual([mockEmail]);
      expect(emailReaderService.fetchEmails).toHaveBeenCalledWith(mockImapConfig, {
        mailbox: 'Sent',
        limit: 50,
        unseenOnly: undefined,
      });
    });
  });

  describe('listFolders', () => {
    it('should list available mailboxes', async () => {
      const folders = [{ name: 'INBOX' }, { name: 'Sent' }];
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.listMailboxes.mockResolvedValue(folders as any);

      const result = await service.listFolders(mockCompanyUser);

      expect(result).toEqual(folders);
    });
  });

  describe('sendEmail', () => {
    it('should send email and save to sent folder', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailSenderService.sendEmailAndSave.mockResolvedValue(undefined);

      const message = { to: 'recipient@test.com', subject: 'Test', text: 'Body' };
      await service.sendEmail(mockCompanyUser, message);

      expect(emailSenderService.sendEmailAndSave).toHaveBeenCalledWith(
        mockSmtpConfig,
        mockImapConfig,
        message
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read via IMAP', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.markAsSeen.mockResolvedValue(undefined);

      await service.markAsRead(mockCompanyUser, [1, 2, 3]);

      expect(emailReaderService.markAsSeen).toHaveBeenCalledWith(mockImapConfig, [1, 2, 3]);
    });
  });

  describe('deleteEmail', () => {
    it('should move to trash when not permanent and trash folder exists', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.findTrashMailbox.mockResolvedValue('Trash');
      emailReaderService.moveMessages.mockResolvedValue(undefined);

      await service.deleteEmail(mockCompanyUser, [1], 'INBOX', false);

      expect(emailReaderService.moveMessages).toHaveBeenCalledWith(
        mockImapConfig,
        [1],
        'INBOX',
        'Trash'
      );
    });

    it('should hard delete when permanent=true', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.deleteEmails.mockResolvedValue(undefined);

      await service.deleteEmail(mockCompanyUser, [1], 'INBOX', true);

      expect(emailReaderService.deleteEmails).toHaveBeenCalledWith(mockImapConfig, [1]);
      expect(emailReaderService.findTrashMailbox).not.toHaveBeenCalled();
    });

    it('should hard delete when trash folder is not found', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.findTrashMailbox.mockRejectedValue(new Error('No trash'));
      emailReaderService.deleteEmails.mockResolvedValue(undefined);

      await service.deleteEmail(mockCompanyUser, [1]);

      expect(emailReaderService.deleteEmails).toHaveBeenCalledWith(mockImapConfig, [1]);
    });
  });

  describe('getEmail', () => {
    it('should fetch single email by UID', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([mockEmail as any]);

      const result = await service.getEmail(mockCompanyUser, 42);

      expect(result).toEqual(mockEmail);
      expect(emailReaderService.fetchEmails).toHaveBeenCalledWith(mockImapConfig, {
        searchCriteria: [['UID', 42]],
        limit: 1,
        markAsSeen: true,
      });
    });

    it('should throw BadRequestException when email not found', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmails.mockResolvedValue([]);

      await expect(service.getEmail(mockCompanyUser, 99)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInboxPaginated', () => {
    it('should fetch paginated inbox emails', async () => {
      const paginatedResult = { emails: [mockEmail], nextCursor: 10, hasMore: true };
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmailsPaginated.mockResolvedValue(paginatedResult as any);

      const result = await service.getInboxPaginated(mockCompanyUser, { limit: 25, cursor: 50 });

      expect(result).toEqual(paginatedResult);
      expect(emailReaderService.fetchEmailsPaginated).toHaveBeenCalledWith(mockImapConfig, {
        mailbox: 'INBOX',
        limit: 25,
        cursor: 50,
        direction: undefined,
      });
    });
  });

  describe('searchEmails', () => {
    it('should search emails with query', async () => {
      const searchResult = { emails: [mockEmail], nextCursor: null, hasMore: false };
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.searchEmails.mockResolvedValue(searchResult as any);

      const result = await service.searchEmails(mockCompanyUser, {
        query: 'faktura',
        field: 'subject',
      });

      expect(result).toEqual(searchResult);
      expect(emailReaderService.searchEmails).toHaveBeenCalledWith(mockImapConfig, {
        query: 'faktura',
        field: 'subject',
      });
    });
  });

  describe('moveMessages', () => {
    it('should move messages between mailboxes', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.moveMessages.mockResolvedValue(undefined);

      await service.moveMessages(mockCompanyUser, [1, 2], 'INBOX', 'Archive');

      expect(emailReaderService.moveMessages).toHaveBeenCalledWith(
        mockImapConfig,
        [1, 2],
        'INBOX',
        'Archive'
      );
    });
  });

  describe('getEmailAttachment', () => {
    it('should return attachment buffer', async () => {
      const attachmentResult = {
        buffer: Buffer.from('data'),
        contentType: 'application/pdf',
        filename: 'file.pdf',
      };
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmailAttachment.mockResolvedValue(attachmentResult);

      const result = await service.getEmailAttachment(mockCompanyUser, 1, 'file.pdf');

      expect(result).toEqual(attachmentResult);
    });

    it('should throw BadRequestException when attachment not found', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(mockEmailConfig);
      emailReaderService.fetchEmailAttachment.mockResolvedValue(null as any);

      await expect(service.getEmailAttachment(mockCompanyUser, 1, 'missing.pdf')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
