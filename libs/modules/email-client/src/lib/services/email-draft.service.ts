import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@accounting/common';
import { EmailDraft } from '../entities/email-draft.entity';
import { CreateDraftDto, UpdateDraftDto } from '../dto/create-draft.dto';

/**
 * Service for managing email drafts
 *
 * Handles CRUD operations for draft emails stored in database.
 * Drafts can be AI-generated or manually created.
 */
@Injectable()
export class EmailDraftService {
  constructor(
    @InjectRepository(EmailDraft)
    private readonly draftRepository: Repository<EmailDraft>,
  ) {}

  /**
   * Create new email draft
   */
  async create(user: User, dto: CreateDraftDto): Promise<EmailDraft> {
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    const draft = this.draftRepository.create({
      ...dto,
      userId: user.id,
      companyId: user.companyId,
    });

    return this.draftRepository.save(draft);
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
   * Update draft
   */
  async update(user: User, draftId: string, dto: UpdateDraftDto): Promise<EmailDraft> {
    const draft = await this.findOne(user, draftId);

    // Only draft creator can update (or company owner)
    if (draft.userId !== user.id && user.role !== 'COMPANY_OWNER') {
      throw new ForbiddenException('You can only edit your own drafts');
    }

    Object.assign(draft, dto);
    return this.draftRepository.save(draft);
  }

  /**
   * Delete draft
   */
  async remove(user: User, draftId: string): Promise<void> {
    const draft = await this.findOne(user, draftId);

    // Only draft creator can delete (or company owner)
    if (draft.userId !== user.id && user.role !== 'COMPANY_OWNER') {
      throw new ForbiddenException('You can only delete your own drafts');
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
}
