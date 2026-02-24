import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { EmailAutoReplyTemplate, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  CreateEmailAutoReplyTemplateDto,
  UpdateEmailAutoReplyTemplateDto,
} from '../dto/email-auto-reply-template.dto';

@Injectable()
export class EmailAutoReplyTemplateService {
  constructor(
    @InjectRepository(EmailAutoReplyTemplate)
    private readonly templateRepository: Repository<EmailAutoReplyTemplate>,
    private readonly tenantService: TenantService
  ) {}

  async findAll(user: User): Promise<EmailAutoReplyTemplate[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    return this.templateRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<EmailAutoReplyTemplate> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const template = await this.templateRepository.findOne({ where: { id, companyId } });
    if (!template) throw new NotFoundException('Auto-reply template not found');
    return template;
  }

  async create(dto: CreateEmailAutoReplyTemplateDto, user: User): Promise<EmailAutoReplyTemplate> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const template = this.templateRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
      keywordMatchMode: dto.keywordMatchMode ?? 'any',
      matchSubjectOnly: dto.matchSubjectOnly ?? false,
      tone: dto.tone ?? 'neutral',
      isActive: dto.isActive ?? true,
    });
    return this.templateRepository.save(template);
  }

  async update(
    id: string,
    dto: UpdateEmailAutoReplyTemplateDto,
    user: User
  ): Promise<EmailAutoReplyTemplate> {
    const template = await this.findOne(id, user);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async remove(id: string, user: User): Promise<void> {
    const template = await this.findOne(id, user);
    await this.templateRepository.remove(template);
  }

  findActiveByCompanyId(companyId: string): Promise<EmailAutoReplyTemplate[]> {
    return this.templateRepository.find({ where: { companyId, isActive: true } });
  }

  async incrementMatchCount(id: string): Promise<void> {
    await this.templateRepository.update(id, {
      matchCount: () => '"matchCount" + 1',
      lastMatchedAt: new Date(),
    });
  }

  matchesEmail(template: EmailAutoReplyTemplate, subject: string, body: string): boolean {
    const keywords = template.triggerKeywords.map((k) => k.toLowerCase());
    const searchText = template.matchSubjectOnly
      ? subject.toLowerCase()
      : `${subject} ${body}`.toLowerCase();

    if (template.keywordMatchMode === 'all') {
      return keywords.every((kw) => searchText.includes(kw));
    }
    return keywords.some((kw) => searchText.includes(kw));
  }
}
