import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { DocumentTemplate, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from '../dto/document-template.dto';

@Injectable()
export class DocumentTemplatesService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
    private readonly tenantService: TenantService
  ) {}

  async findAll(user: User): Promise<DocumentTemplate[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    return this.templateRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<DocumentTemplate> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const template = await this.templateRepository.findOne({ where: { id, companyId } });
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  async create(dto: CreateDocumentTemplateDto, user: User): Promise<DocumentTemplate> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const template = this.templateRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
      category: dto.category ?? 'other',
    });
    return this.templateRepository.save(template);
  }

  async update(id: string, dto: UpdateDocumentTemplateDto, user: User): Promise<DocumentTemplate> {
    const template = await this.findOne(id, user);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async remove(id: string, user: User): Promise<void> {
    const template = await this.findOne(id, user);
    await this.templateRepository.remove(template);
  }
}
