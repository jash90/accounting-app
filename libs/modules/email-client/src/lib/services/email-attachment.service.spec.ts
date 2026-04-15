import { BadRequestException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

import { UserRole, type User } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';
import { type StorageService } from '@accounting/infrastructure/storage';

import { EmailAttachmentService } from './email-attachment.service';

describe('EmailAttachmentService', () => {
  let service: EmailAttachmentService;
  let storageService: jest.Mocked<StorageService>;
  let configService: jest.Mocked<ConfigService>;
  let systemCompanyService: jest.Mocked<SystemCompanyService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    companyId: 'company-123',
    role: UserRole.COMPANY_OWNER,
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: 'test-document.pdf',
    path: '',
  };

  beforeEach(() => {
    storageService = {
      uploadFile: jest
        .fn()
        .mockResolvedValue({ path: 'company-123/email-attachments/1234-test-document.pdf' }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('file content')),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('./uploads'),
    } as any;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockImplementation((user: User) => {
        if (!user.companyId) {
          throw new BadRequestException('User must belong to a company');
        }
        return Promise.resolve(user.companyId);
      }),
    } as any;

    service = new EmailAttachmentService(storageService, configService, systemCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAttachment', () => {
    it('should upload a valid file', async () => {
      const result = await service.uploadAttachment(mockUser as User, mockFile);

      expect(result).toContain('company-123/email-attachments');
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('should throw if user has no company', async () => {
      const noCompanyUser = { ...mockUser, companyId: null };

      await expect(service.uploadAttachment(noCompanyUser as User, mockFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw if file exceeds max size (10MB)', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 }; // 11MB

      await expect(service.uploadAttachment(mockUser as User, largeFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should accept file at exactly max size', async () => {
      const maxFile = { ...mockFile, size: 10 * 1024 * 1024 }; // exactly 10MB

      const result = await service.uploadAttachment(mockUser as User, maxFile);
      expect(result).toBeDefined();
    });

    it('should sanitize filename', async () => {
      const weirdNameFile = { ...mockFile, originalname: '../../../etc/passwd' };

      await service.uploadAttachment(mockUser as User, weirdNameFile);
      const uploadCall = (storageService.uploadFile as jest.Mock).mock.calls[0][0];
      expect(uploadCall.filename).not.toContain('/');
    });
  });

  describe('downloadAttachment', () => {
    it('should download a file belonging to user company', async () => {
      const result = await service.downloadAttachment(
        mockUser as User,
        'company-123/email-attachments/test.pdf'
      );

      expect(result.buffer).toBeDefined();
      expect(result.filename).toBe('test.pdf');
    });

    it('should throw if path does not belong to user company', async () => {
      await expect(
        service.downloadAttachment(mockUser as User, 'other-company/email/test.pdf')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user has no company', async () => {
      const noCompanyUser = { ...mockUser, companyId: null };

      await expect(service.downloadAttachment(noCompanyUser as User, 'test.pdf')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getAbsolutePath', () => {
    it('should resolve path relative to base storage path', () => {
      const result = service.getAbsolutePath('company-123/file.pdf');

      expect(result).toContain('uploads');
      expect(result).toContain('company-123/file.pdf');
      expect(result).not.toContain('..');
    });
  });
});
