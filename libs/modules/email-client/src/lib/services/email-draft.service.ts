import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from '@accounting/common';
import { EmailConfigurationService } from '@accounting/email';

import { EmailDraftSyncService, SyncResult } from './email-draft-sync.service';
import { CreateDraftDto, UpdateDraftDto } from '../dto/create-draft.dto';
import { EmailDraft } from '../entities/email-draft.entity';

/**
 * Service for managing email drafts
 *
 * Handles CRUD operations for draft emails stored in database.
 * Drafts can be AI-generated or manually created.
 * Supports two-way synchronization with IMAP server.
 */
@Injectable()
export class EmailDraftService {
  private readonly logger = new Logger(EmailDraftService.name);

  constructor(
    @InjectRepository(EmailDraft)
    private readonly draftRepository: Repository<EmailDraft>,
    @Inject(forwardRef(() => EmailDraftSyncService))
    private readonly draftSyncService: EmailDraftSyncService,
    private readonly emailConfigService: EmailConfigurationService
  ) {}

  /**
   * Create new email draft with optional IMAP sync
   */
  async create(user: User, dto: CreateDraftDto, syncToImap = true): Promise<EmailDraft> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    const draft = this.draftRepository.create({
      ...dto,
      userId: user.id,
      companyId: user.companyId,
      syncStatus: 'local', // Will be synced
    });

    const savedDraft = await this.draftRepository.save(draft);

    // Sync to IMAP if enabled
    if (syncToImap) {
      const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
        user.companyId
      );
      if (emailConfig) {
        try {
          await this.draftSyncService.pushDraftToImap(savedDraft, emailConfig);
        } catch (error) {
          // Log but don't fail - draft is saved locally
          this.logger.warn(`Failed to sync draft to IMAP: ${(error as Error).message}`);
        }
      }
    }

    return savedDraft;
  }

  /**
   * Get all drafts for user's company
   */
  async findAll(user: User): Promise<EmailDraft[]> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    return this.draftRepository.find({
      where: { companyId: user.companyId },
      order: { updatedAt: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Get draft by ID
   */
  async findOne(user: User, draftId: string): Promise<EmailDraft> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    const draft = await this.draftRepository.findOne({
      where: { id: draftId, companyId: user.companyId },
      relations: ['user'],
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return draft;
  }

  /**
   * Update draft with optional IMAP sync
   */
  async update(user: User, draftId: string, dto: UpdateDraftDto): Promise<EmailDraft> {
    const draft = await this.findOne(user, draftId);

    // Only draft creator can update (or company owner)
    if (draft.userId !== user.id && user.role !== 'COMPANY_OWNER') {
      throw new ForbiddenException('You can only edit your own drafts');
    }

    // companyId is validated in findOne() which throws if missing
    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
      user.companyId as string
    );

    if (emailConfig && draft.syncStatus === 'synced' && draft.imapUid) {
      try {
        return await this.draftSyncService.updateDraftWithSync(draft, dto, emailConfig);
      } catch (error) {
        this.logger.warn(`Failed to sync draft update to IMAP: ${(error as Error).message}`);
        // Fall through to local update only
      }
    }

    // Local update only
    Object.assign(draft, dto);
    return this.draftRepository.save(draft);
  }

  /**
   * Delete draft with IMAP sync
   */
  async remove(user: User, draftId: string): Promise<void> {
    const draft = await this.findOne(user, draftId);

    // Only draft creator can delete (or company owner)
    if (draft.userId !== user.id && user.role !== 'COMPANY_OWNER') {
      throw new ForbiddenException('You can only delete your own drafts');
    }

    // companyId is validated in findOne() which throws if missing
    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(
      user.companyId as string
    );

    if (emailConfig && draft.imapUid) {
      try {
        await this.draftSyncService.deleteDraftWithSync(draft, emailConfig);
        return;
      } catch (error) {
        this.logger.warn(`Failed to delete draft from IMAP: ${(error as Error).message}`);
        // Fall through to local delete only
      }
    }

    await this.draftRepository.remove(draft);
  }

  /**
   * Get drafts created by current user
   */
  async findMyDrafts(user: User): Promise<EmailDraft[]> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    return this.draftRepository.find({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Get AI-generated drafts only
   */
  async findAiDrafts(user: User): Promise<EmailDraft[]> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    return this.draftRepository.find({
      where: {
        companyId: user.companyId,
        isAiGenerated: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Sync all drafts with IMAP server
   */
  async syncWithImap(user: User): Promise<SyncResult> {
    return this.draftSyncService.syncDrafts(user);
  }

  /**
   * Get drafts with sync conflicts
   */
  async findConflicts(user: User): Promise<EmailDraft[]> {
    return this.draftSyncService.findConflicts(user);
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    user: User,
    draftId: string,
    resolution: 'keep_local' | 'keep_imap'
  ): Promise<EmailDraft> {
    return this.draftSyncService.resolveConflict(draftId, resolution, user);
  }

  /**
   * Delete all drafts for user's company
   */
  async removeAll(user: User): Promise<{ deleted: number; errors: string[] }> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    try {
      this.logger.log(`Deleting all drafts for company ${user.companyId}`);
      const deleteResult = await this.draftRepository.delete({ companyId: user.companyId });
      const deleted = deleteResult.affected || 0;
      this.logger.log(`Deleted ${deleted} drafts from database`);
      return { deleted, errors: [] };
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error(`Failed to delete drafts: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to delete drafts: ${errorMessage}`);
    }
  }
}
