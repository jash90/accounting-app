import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { UserRole, type User } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';
import { type EmailConfigurationService } from '@accounting/email';

import { type EmailDraftSyncService } from './email-draft-sync.service';
import { EmailDraftService } from './email-draft.service';
import { EmailDraft } from '../entities/email-draft.entity';

describe('EmailDraftService', () => {
  let service: EmailDraftService;
  let draftRepository: jest.Mocked<Repository<EmailDraft>>;
  let draftSyncService: jest.Mocked<
    Pick<
      EmailDraftSyncService,
      | 'pushDraftToImap'
      | 'syncDrafts'
      | 'findConflicts'
      | 'resolveConflict'
      | 'updateDraftWithSync'
      | 'deleteDraftWithSync'
    >
  >;
  let emailConfigService: jest.Mocked<
    Pick<EmailConfigurationService, 'getDecryptedEmailConfigByCompanyId'>
  >;
  let systemCompanyService: jest.Mocked<SystemCompanyService>;

  const companyId = 'company-1';
  const userId = 'user-1';
  const mockUser = { id: userId, companyId, role: UserRole.EMPLOYEE } as User;
  const mockOwner = { id: 'owner-1', companyId, role: 'COMPANY_OWNER' } as unknown as User;

  const mockDraft: EmailDraft = {
    id: 'draft-1',
    companyId,
    userId,
    to: ['recipient@test.com'],
    subject: 'Test Draft',
    textContent: 'Body text',
    isAiGenerated: false,
    syncStatus: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmailDraft;

  const mockEmailConfig = {
    smtp: {
      host: 'smtp.test.com',
      port: 465,
      secure: true,
      auth: { user: 'test@test.com', pass: 'pass' },
    },
    imap: { host: 'imap.test.com', port: 993, tls: true, user: 'test@test.com', password: 'pass' },
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

    draftSyncService = {
      pushDraftToImap: jest.fn(),
      syncDrafts: jest.fn(),
      findConflicts: jest.fn(),
      resolveConflict: jest.fn(),
      updateDraftWithSync: jest.fn(),
      deleteDraftWithSync: jest.fn(),
    };

    emailConfigService = {
      getDecryptedEmailConfigByCompanyId: jest.fn(),
    };

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockImplementation((user: User) => {
        if (!user.companyId) {
          throw new ForbiddenException('User must belong to a company');
        }
        return Promise.resolve(user.companyId);
      }),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailDraftService,
          useFactory: () =>
            new EmailDraftService(
              draftRepository as any,
              draftSyncService as any,
              emailConfigService as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(EmailDraft), useValue: draftRepository },
      ],
    }).compile();

    service = module.get(EmailDraftService);
  });

  describe('create', () => {
    const createDto = { to: ['test@test.com'], textContent: 'Hello' };

    it('should create draft and sync to IMAP', async () => {
      draftRepository.create.mockReturnValue(mockDraft);
      draftRepository.save.mockResolvedValue(mockDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      draftSyncService.pushDraftToImap.mockResolvedValue(undefined);

      const result = await service.create(mockUser, createDto as any);

      expect(result).toEqual(mockDraft);
      expect(draftRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, companyId, syncStatus: 'local' })
      );
      expect(draftSyncService.pushDraftToImap).toHaveBeenCalled();
    });

    it('should create draft without IMAP sync when syncToImap=false', async () => {
      draftRepository.create.mockReturnValue(mockDraft);
      draftRepository.save.mockResolvedValue(mockDraft);

      await service.create(mockUser, createDto as any, false);

      expect(draftSyncService.pushDraftToImap).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no companyId', async () => {
      const noCompanyUser = { id: 'user-2', role: UserRole.EMPLOYEE } as User;

      await expect(service.create(noCompanyUser, createDto as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should not fail when IMAP sync fails', async () => {
      draftRepository.create.mockReturnValue(mockDraft);
      draftRepository.save.mockResolvedValue(mockDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      draftSyncService.pushDraftToImap.mockRejectedValue(new Error('IMAP error'));

      const result = await service.create(mockUser, createDto as any);

      expect(result).toEqual(mockDraft);
    });
  });

  describe('findAll', () => {
    it('should return all drafts for company with user relation', async () => {
      draftRepository.find.mockResolvedValue([mockDraft]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([mockDraft]);
      expect(draftRepository.find).toHaveBeenCalledWith({
        where: { companyId },
        order: { updatedAt: 'DESC' },
        relations: ['user'],
      });
    });

    it('should throw ForbiddenException when user has no companyId', () => {
      const noCompanyUser = { id: 'user-2', role: UserRole.EMPLOYEE } as User;

      expect(() => service.findAll(noCompanyUser)).toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return draft by id with tenant isolation', async () => {
      draftRepository.findOne.mockResolvedValue(mockDraft);

      const result = await service.findOne(mockUser, 'draft-1');

      expect(result).toEqual(mockDraft);
      expect(draftRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'draft-1', companyId },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when draft not found', async () => {
      draftRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update draft owned by user', async () => {
      draftRepository.findOne.mockResolvedValue(mockDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(null);
      draftRepository.save.mockResolvedValue({ ...mockDraft, subject: 'Updated' } as EmailDraft);

      const result = await service.update(mockUser, 'draft-1', { subject: 'Updated' } as any);

      expect(result.subject).toBe('Updated');
    });

    it('should allow company owner to update any draft', async () => {
      draftRepository.findOne.mockResolvedValue(mockDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(null);
      draftRepository.save.mockResolvedValue(mockDraft);

      await expect(
        service.update(mockOwner, 'draft-1', { subject: 'Owner Update' } as any)
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException when non-owner tries to update other user draft', async () => {
      const otherUser = { id: 'other-user', companyId, role: UserRole.EMPLOYEE } as User;
      draftRepository.findOne.mockResolvedValue(mockDraft);

      await expect(
        service.update(otherUser, 'draft-1', { subject: 'Hack' } as any)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete draft with IMAP sync when possible', async () => {
      const syncedDraft = { ...mockDraft, imapUid: 100, syncStatus: 'synced' } as EmailDraft;
      draftRepository.findOne.mockResolvedValue(syncedDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(
        mockEmailConfig as any
      );
      draftSyncService.deleteDraftWithSync.mockResolvedValue(undefined);

      await service.remove(mockUser, 'draft-1');

      expect(draftSyncService.deleteDraftWithSync).toHaveBeenCalledWith(
        syncedDraft,
        mockEmailConfig
      );
    });

    it('should delete locally when no IMAP config', async () => {
      draftRepository.findOne.mockResolvedValue(mockDraft);
      emailConfigService.getDecryptedEmailConfigByCompanyId.mockResolvedValue(null);
      draftRepository.remove.mockResolvedValue(mockDraft);

      await service.remove(mockUser, 'draft-1');

      expect(draftRepository.remove).toHaveBeenCalledWith(mockDraft);
    });

    it('should throw ForbiddenException when non-owner tries to delete other user draft', async () => {
      const otherUser = { id: 'other-user', companyId, role: UserRole.EMPLOYEE } as User;
      draftRepository.findOne.mockResolvedValue(mockDraft);

      await expect(service.remove(otherUser, 'draft-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMyDrafts', () => {
    it('should return drafts created by user', async () => {
      draftRepository.find.mockResolvedValue([mockDraft]);

      const result = await service.findMyDrafts(mockUser);

      expect(result).toEqual([mockDraft]);
      expect(draftRepository.find).toHaveBeenCalledWith({
        where: { userId, companyId },
        order: { updatedAt: 'DESC' },
      });
    });
  });

  describe('findAiDrafts', () => {
    it('should return AI-generated drafts for company', async () => {
      const aiDraft = { ...mockDraft, isAiGenerated: true } as EmailDraft;
      draftRepository.find.mockResolvedValue([aiDraft]);

      const result = await service.findAiDrafts(mockUser);

      expect(result).toEqual([aiDraft]);
      expect(draftRepository.find).toHaveBeenCalledWith({
        where: { companyId, isAiGenerated: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('delegation methods', () => {
    it('syncWithImap should delegate to draftSyncService', async () => {
      const syncResult = { synced: 1, imported: 2, conflicts: 0, deleted: 0, errors: [] };
      draftSyncService.syncDrafts.mockResolvedValue(syncResult);

      const result = await service.syncWithImap(mockUser);

      expect(result).toEqual(syncResult);
      expect(draftSyncService.syncDrafts).toHaveBeenCalledWith(mockUser);
    });

    it('findConflicts should delegate to draftSyncService', async () => {
      draftSyncService.findConflicts.mockResolvedValue([]);

      await service.findConflicts(mockUser);

      expect(draftSyncService.findConflicts).toHaveBeenCalledWith(mockUser);
    });

    it('resolveConflict should delegate to draftSyncService', async () => {
      draftSyncService.resolveConflict.mockResolvedValue(mockDraft);

      await service.resolveConflict(mockUser, 'draft-1', 'keep_local');

      expect(draftSyncService.resolveConflict).toHaveBeenCalledWith(
        'draft-1',
        'keep_local',
        mockUser
      );
    });
  });
});
