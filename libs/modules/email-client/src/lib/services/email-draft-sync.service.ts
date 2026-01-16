import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@accounting/common';
import {
  EmailReaderService,
  EmailConfigurationService,
  ReceivedEmail,
} from '@accounting/email';
import { EmailDraft } from '../entities/email-draft.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MailComposer = require('nodemailer/lib/mail-composer');

export interface SyncResult {
  synced: number;
  imported: number;
  conflicts: number;
  deleted: number;
  errors: string[];
}

/**
 * Service for two-way synchronization of email drafts between database and IMAP server
 *
 * Handles:
 * - Pushing local drafts to IMAP Drafts folder
 * - Importing drafts from IMAP to local database
 * - Detecting and resolving sync conflicts
 * - Updating and deleting drafts in both places
 */
@Injectable()
export class EmailDraftSyncService {
  private readonly logger = new Logger(EmailDraftSyncService.name);

  constructor(
    @InjectRepository(EmailDraft)
    private readonly draftRepository: Repository<EmailDraft>,
    private readonly emailReaderService: EmailReaderService,
    private readonly emailConfigService: EmailConfigurationService,
  ) {}

  /**
   * Full two-way sync of drafts between database and IMAP
   */
  async syncDrafts(user: User): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      imported: 0,
      conflicts: 0,
      deleted: 0,
      errors: [],
    };

    try {
      const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId!);
      if (!emailConfig) {
        throw new Error('No email configuration found');
      }

      // Step 1: Fetch all drafts from IMAP
      const imapDrafts = await this.emailReaderService.fetchDrafts(emailConfig.imap, { limit: 100 });
      this.logger.log(`Found ${imapDrafts.length} drafts on IMAP server`);

      // Step 2: Fetch all drafts from database for this company
      const dbDrafts = await this.draftRepository.find({
        where: { companyId: user.companyId! },
      });
      this.logger.log(`Found ${dbDrafts.length} drafts in database`);

      // Step 3: Build lookup maps
      const imapByUid = new Map(imapDrafts.map(d => [d.uid, d]));
      const dbByImapUid = new Map(
        dbDrafts.filter(d => d.imapUid).map(d => [d.imapUid!, d])
      );

      // Step 4: Push local drafts to IMAP (drafts with syncStatus='local')
      const localDrafts = dbDrafts.filter(d => d.syncStatus === 'local');
      for (const draft of localDrafts) {
        try {
          await this.pushDraftToImap(draft, emailConfig);
          result.synced++;
        } catch (error) {
          result.errors.push(`Failed to push draft ${draft.id}: ${(error as Error).message}`);
        }
      }

      // Step 5: Import new drafts from IMAP (not in database)
      for (const imapDraft of imapDrafts) {
        const existingByUid = dbByImapUid.get(imapDraft.uid);
        if (!existingByUid) {
          try {
            await this.importDraftFromImap(imapDraft, user, emailConfig);
            result.imported++;
          } catch (error) {
            result.errors.push(`Failed to import IMAP draft ${imapDraft.uid}: ${(error as Error).message}`);
          }
        }
      }

      // Step 6: Handle deletions - drafts in DB with imapUid but not in IMAP
      const syncedDrafts = dbDrafts.filter(d => d.syncStatus === 'synced' && d.imapUid);
      for (const draft of syncedDrafts) {
        if (!imapByUid.has(draft.imapUid!)) {
          // Draft was deleted from IMAP, remove from DB
          await this.draftRepository.remove(draft);
          result.deleted++;
          this.logger.log(`Deleted draft ${draft.id} (removed from IMAP)`);
        }
      }

      // Step 7: Detect conflicts (draft modified locally after last sync)
      for (const draft of dbDrafts.filter(d => d.syncStatus === 'synced' && d.imapUid && d.imapSyncedAt)) {
        if (draft.updatedAt > draft.imapSyncedAt!) {
          // DB was modified after last sync - mark as conflict
          draft.syncStatus = 'conflict';
          await this.draftRepository.save(draft);
          result.conflicts++;
          this.logger.log(`Draft ${draft.id} marked as conflict`);
        }
      }

      this.logger.log(`Sync complete: synced=${result.synced}, imported=${result.imported}, conflicts=${result.conflicts}, deleted=${result.deleted}`);
      return result;

    } catch (error) {
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Push a database draft to IMAP
   */
  async pushDraftToImap(draft: EmailDraft, emailConfig: any): Promise<void> {
    // Compose MIME message
    const rawMessage = await this.composeDraftMime(draft, emailConfig.smtp.auth.user);

    // Append to IMAP Drafts folder
    const { uid, mailbox } = await this.emailReaderService.appendToDrafts(
      emailConfig.imap,
      rawMessage,
    );

    // Update database record
    draft.imapUid = uid;
    draft.imapMailbox = mailbox;
    draft.imapSyncedAt = new Date();
    draft.syncStatus = 'synced';

    await this.draftRepository.save(draft);
    this.logger.log(`Draft ${draft.id} synced to IMAP with UID ${uid}`);
  }

  /**
   * Import a draft from IMAP to database
   */
  async importDraftFromImap(
    imapDraft: ReceivedEmail,
    user: User,
    emailConfig: any,
  ): Promise<EmailDraft> {
    const draftsMailbox = await this.emailReaderService.findDraftsMailbox(emailConfig.imap);

    const draft = this.draftRepository.create({
      companyId: user.companyId!,
      userId: user.id,
      to: imapDraft.to.map(a => a.address),
      cc: imapDraft.cc?.map(a => a.address),
      subject: imapDraft.subject,
      textContent: imapDraft.text || '',
      htmlContent: imapDraft.html,
      imapUid: imapDraft.uid,
      imapMailbox: draftsMailbox,
      imapSyncedAt: new Date(),
      syncStatus: 'synced',
      isAiGenerated: false,
    });

    const savedDraft = await this.draftRepository.save(draft);
    this.logger.log(`Imported draft from IMAP UID ${imapDraft.uid} as ${savedDraft.id}`);
    return savedDraft;
  }

  /**
   * Compose MIME message from draft
   */
  private async composeDraftMime(draft: EmailDraft, fromEmail: string): Promise<Buffer> {
    const mail = new MailComposer({
      from: fromEmail,
      to: draft.to.join(', '),
      cc: draft.cc?.join(', '),
      bcc: draft.bcc?.join(', '),
      subject: draft.subject || '',
      text: draft.textContent,
      html: draft.htmlContent,
    });

    return mail.compile().build();
  }

  /**
   * Update draft in both database and IMAP
   */
  async updateDraftWithSync(
    draft: EmailDraft,
    updates: Partial<EmailDraft>,
    emailConfig: any,
  ): Promise<EmailDraft> {
    // Update database
    Object.assign(draft, updates);

    // If already synced to IMAP, update there too
    if (draft.imapUid && draft.syncStatus === 'synced') {
      const rawMessage = await this.composeDraftMime(draft, emailConfig.smtp.auth.user);
      const { uid } = await this.emailReaderService.updateDraftInImap(
        emailConfig.imap,
        draft.imapUid,
        rawMessage,
      );
      draft.imapUid = uid;
      draft.imapSyncedAt = new Date();
    }

    return this.draftRepository.save(draft);
  }

  /**
   * Delete draft from both database and IMAP
   */
  async deleteDraftWithSync(draft: EmailDraft, emailConfig: any): Promise<void> {
    // Delete from IMAP if synced
    if (draft.imapUid && draft.syncStatus === 'synced') {
      try {
        await this.emailReaderService.deleteDraftFromImap(emailConfig.imap, draft.imapUid);
      } catch (error) {
        this.logger.warn(`Failed to delete draft from IMAP: ${(error as Error).message}`);
        // Continue with DB deletion even if IMAP fails
      }
    }

    // Delete from database
    await this.draftRepository.remove(draft);
  }

  /**
   * Resolve a sync conflict by choosing which version to keep
   */
  async resolveConflict(
    draftId: string,
    resolution: 'keep_local' | 'keep_imap',
    user: User,
  ): Promise<EmailDraft> {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, companyId: user.companyId! },
    });

    if (!draft || draft.syncStatus !== 'conflict') {
      throw new Error('Draft not found or not in conflict state');
    }

    const emailConfig = await this.emailConfigService.getDecryptedEmailConfigByCompanyId(user.companyId!);
    if (!emailConfig) {
      throw new Error('No email configuration found');
    }

    switch (resolution) {
      case 'keep_local':
        // Push local version to IMAP (overwrite)
        if (draft.imapUid) {
          const rawMessage = await this.composeDraftMime(draft, emailConfig.smtp.auth.user);
          const { uid } = await this.emailReaderService.updateDraftInImap(
            emailConfig.imap,
            draft.imapUid,
            rawMessage,
          );
          draft.imapUid = uid;
        } else {
          // No IMAP UID, push as new
          await this.pushDraftToImap(draft, emailConfig);
        }
        break;

      case 'keep_imap':
        // Fetch IMAP version and overwrite local
        if (draft.imapUid) {
          const imapDrafts = await this.emailReaderService.fetchDrafts(emailConfig.imap, {
            limit: 100,
          });
          const imapDraft = imapDrafts.find(d => d.uid === draft.imapUid);
          if (imapDraft) {
            draft.to = imapDraft.to.map(a => a.address);
            draft.cc = imapDraft.cc?.map(a => a.address);
            draft.subject = imapDraft.subject;
            draft.textContent = imapDraft.text || '';
            draft.htmlContent = imapDraft.html;
          }
        }
        break;
    }

    draft.syncStatus = 'synced';
    draft.imapSyncedAt = new Date();
    return this.draftRepository.save(draft);
  }

  /**
   * Get drafts with sync conflicts
   */
  async findConflicts(user: User): Promise<EmailDraft[]> {
    return this.draftRepository.find({
      where: {
        companyId: user.companyId!,
        syncStatus: 'conflict',
      },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Delete all drafts for a user (from database only - IMAP cleanup happens on next sync)
   */
  async deleteAllDrafts(user: User): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] as string[] };

    try {
      this.logger.log(`Deleting all drafts for company ${user.companyId}`);

      // Delete all from database
      const deleteResult = await this.draftRepository.delete({ companyId: user.companyId! });
      result.deleted = deleteResult.affected || 0;

      this.logger.log(`Deleted ${result.deleted} drafts from database`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to delete drafts: ${(error as Error).message}`);
      result.errors.push((error as Error).message);
      return result;
    }
  }
}
