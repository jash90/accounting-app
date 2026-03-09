import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { type User } from '@accounting/common';
import { type EmailConfigurationService, type EmailReaderService } from '@accounting/email';

import { EmailDraftSyncService } from './email-draft-sync.service';
import { EmailDraft } from '../entities/email-draft.entity';

describe('EmailDraftSyncService', () => {
  let service: EmailDraftSyncService;
  let draftRepository: jest.Mocked<Repository<EmailDraft>>;
  let emailReaderService: jest.Mocked<
    Pick<
      EmailReaderService,
      | 'fetchDrafts'
      | 'appendToDrafts'
      | 'findDraftsMailbox'
      | 'updateDraftInImap'
      | 'deleteDraftFromImap'
    >
  >;
  let emailConfigService: jest.Mocked<
    Pick<EmailConfigurationService, 'getDecryptedEmailConfigByCompanyId'>
  >;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

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

  const mockDraft: EmailDraft = {
    id: 'draft-1',
    companyId,
    userId: 'user-1',
    to: ['recipient@test.com'],
    subject: 'Test Draft',
    textContent: 'Draft body',
    isAiGenerated: false,
    syncStatus: 'local',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as EmailDraft;

  const mockImapDraft = {
    uid: 100,
    subject: 'IMAP Draft',
    from: [{ name: 'Me', address: 'test@test.com' }],
    to: [{ name: 'Recipient', address: 'recipient@test.com' }],
    text: 'IMAP draft body',
    date: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    draftRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<EmailDraft>>;

    emailReaderService = {
      fetchDrafts: jest.fn(),
      appendToDrafts: jest.fn(),
      findDraftsMailbox: jest.fn(),
      updateDraftInImap: jest.fn(),
      deleteDraftFromImap: jest.fn(),
    };

    emailConfigService = {
      getDecryptedEmailConfigByCompanyId: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailDraftSyncService,
          useFactory: () =>
            new EmailDraftSyncService(
              draftRepository as any,
              emailReaderService as any,
              emailConfigService as any
            ),
        },
        { provide: getRepositoryToken(EmailDraft), useValue: draftRepository },
      ],
    }).compile();

    service = module.get(EmailDraftSyncService);
  });

  describe('syncDrafts', () => {
    it('should return early with error when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2' } as User;

      const result = await service.syncDrafts(noCompanyUser);

      expect(result.errors).toContain('User must belong to a company');
      expect(result.synced).toBe(0);
    });

    it('should return error when no email configuration found', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(null);

      const result = await service.syncDrafts(mockUser);

      expect(result.errors).toContain('No email configuration found');
    });

    it('should push local drafts to IMAP', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      emailReaderService.fetchDrafts.mockResolvedValue([]);
      draftRepository.find.mockResolvedValue([{ ...mockDraft, syncStatus: 'local' } as EmailDraft]);
      emailReaderService.appendToDrafts.mockResolvedValue({ uid: 200, mailbox: 'Drafts' });
      draftRepository.save.mockResolvedValue(mockDraft);

      const result = await service.syncDrafts(mockUser);

      expect(result.synced).toBe(1);
      expect(emailReaderService.appendToDrafts).toHaveBeenCalled();
    });

    it('should import new drafts from IMAP', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      emailReaderService.fetchDrafts.mockResolvedValue([mockImapDraft as any]);
      draftRepository.find.mockResolvedValue([]); // no local drafts
      emailReaderService.findDraftsMailbox.mockResolvedValue('Drafts');
      draftRepository.create.mockReturnValue(mockDraft);
      draftRepository.save.mockResolvedValue(mockDraft);

      const result = await service.syncDrafts(mockUser);

      expect(result.imported).toBe(1);
    });

    it('should delete DB drafts that are gone from IMAP', async () => {
      const syncedDraft = {
        ...mockDraft,
        syncStatus: 'synced' as const,
        imapUid: 999,
        imapSyncedAt: new Date('2026-01-01'),
      } as EmailDraft;

      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      emailReaderService.fetchDrafts.mockResolvedValue([]); // empty IMAP = draft was deleted
      draftRepository.find.mockResolvedValue([syncedDraft]);
      draftRepository.remove.mockResolvedValue(syncedDraft);

      const result = await service.syncDrafts(mockUser);

      expect(result.deleted).toBe(1);
      expect(draftRepository.remove).toHaveBeenCalledWith(syncedDraft);
    });

    it('should detect conflicts when DB draft modified after last sync', async () => {
      const conflictDraft = {
        ...mockDraft,
        syncStatus: 'synced' as const,
        imapUid: 100,
        imapSyncedAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'), // modified after sync
      } as EmailDraft;

      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      emailReaderService.fetchDrafts.mockResolvedValue([mockImapDraft as any]); // imapUid=100 present
      draftRepository.find.mockResolvedValue([conflictDraft]);
      draftRepository.save.mockResolvedValue(conflictDraft);

      const result = await service.syncDrafts(mockUser);

      expect(result.conflicts).toBe(1);
    });

    it('should handle push errors gracefully', async () => {
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      emailReaderService.fetchDrafts.mockResolvedValue([]);
      draftRepository.find.mockResolvedValue([{ ...mockDraft, syncStatus: 'local' } as EmailDraft]);
      emailReaderService.appendToDrafts.mockRejectedValue(new Error('IMAP error'));

      const result = await service.syncDrafts(mockUser);

      expect(result.synced).toBe(0);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('pushDraftToImap', () => {
    it('should append draft to IMAP and update DB record', async () => {
      emailReaderService.appendToDrafts.mockResolvedValue({ uid: 200, mailbox: 'Drafts' });
      draftRepository.save.mockResolvedValue(mockDraft);

      await service.pushDraftToImap(mockDraft, mockEmailConfig as any);

      expect(emailReaderService.appendToDrafts).toHaveBeenCalled();
      expect(draftRepository.save).toHaveBeenCalled();
      expect(mockDraft.imapUid).toBe(200);
      expect(mockDraft.syncStatus).toBe('synced');
    });
  });

  describe('importDraftFromImap', () => {
    it('should create DB record from IMAP draft', async () => {
      emailReaderService.findDraftsMailbox.mockResolvedValue('Drafts');
      draftRepository.create.mockReturnValue(mockDraft);
      draftRepository.save.mockResolvedValue(mockDraft);

      const result = await service.importDraftFromImap(
        mockImapDraft as any,
        mockUser,
        mockEmailConfig as any
      );

      expect(result).toEqual(mockDraft);
      expect(draftRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          userId: 'user-1',
          subject: 'IMAP Draft',
          syncStatus: 'synced',
        })
      );
    });
  });

  describe('updateDraftWithSync', () => {
    it('should update draft in both DB and IMAP when synced', async () => {
      const syncedDraft = {
        ...mockDraft,
        imapUid: 100,
        syncStatus: 'synced' as const,
      } as EmailDraft;
      emailReaderService.updateDraftInImap.mockResolvedValue({ uid: 101 });
      draftRepository.save.mockResolvedValue(syncedDraft);

      await service.updateDraftWithSync(
        syncedDraft,
        { subject: 'Updated' },
        mockEmailConfig as any
      );

      expect(emailReaderService.updateDraftInImap).toHaveBeenCalled();
      expect(draftRepository.save).toHaveBeenCalled();
    });

    it('should only update DB when draft is local (no imapUid)', async () => {
      const localDraft = { ...mockDraft, syncStatus: 'local' as const } as EmailDraft;
      draftRepository.save.mockResolvedValue(localDraft);

      await service.updateDraftWithSync(localDraft, { subject: 'Updated' }, mockEmailConfig as any);

      expect(emailReaderService.updateDraftInImap).not.toHaveBeenCalled();
      expect(draftRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteDraftWithSync', () => {
    it('should delete from both IMAP and DB when synced', async () => {
      const syncedDraft = {
        ...mockDraft,
        imapUid: 100,
        syncStatus: 'synced' as const,
      } as EmailDraft;
      emailReaderService.deleteDraftFromImap.mockResolvedValue(undefined);
      draftRepository.remove.mockResolvedValue(syncedDraft);

      await service.deleteDraftWithSync(syncedDraft, mockEmailConfig as any);

      expect(emailReaderService.deleteDraftFromImap).toHaveBeenCalledWith(mockImapConfig, 100);
      expect(draftRepository.remove).toHaveBeenCalledWith(syncedDraft);
    });

    it('should still delete from DB when IMAP delete fails', async () => {
      const syncedDraft = {
        ...mockDraft,
        imapUid: 100,
        syncStatus: 'synced' as const,
      } as EmailDraft;
      emailReaderService.deleteDraftFromImap.mockRejectedValue(new Error('IMAP error'));
      draftRepository.remove.mockResolvedValue(syncedDraft);

      await service.deleteDraftWithSync(syncedDraft, mockEmailConfig as any);

      expect(draftRepository.remove).toHaveBeenCalledWith(syncedDraft);
    });

    it('should only delete from DB when draft is local', async () => {
      const localDraft = { ...mockDraft, syncStatus: 'local' as const } as EmailDraft;
      draftRepository.remove.mockResolvedValue(localDraft);

      await service.deleteDraftWithSync(localDraft, mockEmailConfig as any);

      expect(emailReaderService.deleteDraftFromImap).not.toHaveBeenCalled();
      expect(draftRepository.remove).toHaveBeenCalledWith(localDraft);
    });
  });

  describe('resolveConflict', () => {
    it('should throw when draft not found', async () => {
      draftRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveConflict('draft-1', 'keep_local', mockUser)).rejects.toThrow(
        'Draft not found or not in conflict state'
      );
    });

    it('should throw when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2' } as User;

      await expect(service.resolveConflict('draft-1', 'keep_local', noCompanyUser)).rejects.toThrow(
        'User must belong to a company'
      );
    });
  });

  describe('findConflicts', () => {
    it('should return conflict drafts for user company', async () => {
      const conflicts = [{ ...mockDraft, syncStatus: 'conflict' }] as EmailDraft[];
      draftRepository.find.mockResolvedValue(conflicts);

      const result = await service.findConflicts(mockUser);

      expect(result).toEqual(conflicts);
      expect(draftRepository.find).toHaveBeenCalledWith({
        where: { companyId, syncStatus: 'conflict' },
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return empty array when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2' } as User;

      const result = await service.findConflicts(noCompanyUser);

      expect(result).toEqual([]);
    });
  });

  describe('deleteAllDrafts', () => {
    it('should delete all drafts for company', async () => {
      draftRepository.delete.mockResolvedValue({ affected: 5, raw: [] });

      const result = await service.deleteAllDrafts(mockUser);

      expect(result.deleted).toBe(5);
      expect(result.errors).toEqual([]);
      expect(draftRepository.delete).toHaveBeenCalledWith({ companyId });
    });

    it('should return error when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2' } as User;

      const result = await service.deleteAllDrafts(noCompanyUser);

      expect(result.errors).toContain('User must belong to a company');
      expect(result.deleted).toBe(0);
    });
  });
});
