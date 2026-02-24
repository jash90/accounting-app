import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as Handlebars from 'handlebars';
import { Repository } from 'typeorm';

import { DocumentTemplate, GeneratedDocument, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { GenerateDocumentDto } from '../dto/generated-document.dto';

@Injectable()
export class GeneratedDocumentsService {
  constructor(
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocRepository: Repository<GeneratedDocument>,
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
    private readonly tenantService: TenantService
  ) {}

  async findAll(user: User): Promise<GeneratedDocument[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    return this.generatedDocRepository.find({
      where: { companyId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<GeneratedDocument> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const doc = await this.generatedDocRepository.findOne({
      where: { id, companyId },
      relations: ['template'],
    });
    if (!doc) throw new NotFoundException('Generated document not found');
    return doc;
  }

  async generate(dto: GenerateDocumentDto, user: User): Promise<GeneratedDocument> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const template = await this.templateRepository.findOne({
      where: { id: dto.templateId, companyId },
    });

    if (!template) {
      throw new NotFoundException('Document template not found');
    }

    let renderedContent: string | null = null;

    if (template.templateContent) {
      try {
        const compiledTemplate = Handlebars.compile(template.templateContent);
        renderedContent = compiledTemplate(dto.placeholderData ?? {});
      } catch {
        // If Handlebars compilation fails, store plain template content
        renderedContent = template.templateContent;
      }
    }

    const doc = this.generatedDocRepository.create({
      name: dto.name,
      templateId: dto.templateId,
      generatedById: user.id,
      companyId,
      metadata: {
        ...dto.placeholderData,
        renderedContent,
      },
      sourceModule: dto.sourceModule,
      sourceEntityId: dto.sourceEntityId,
    });

    return this.generatedDocRepository.save(doc);
  }

  async getContent(id: string, user: User): Promise<string> {
    const doc = await this.findOne(id, user);
    const rendered = (doc.metadata as Record<string, unknown> | null)?.renderedContent;
    if (!rendered || typeof rendered !== 'string') {
      throw new NotFoundException('Document content not available');
    }
    return rendered;
  }

  async remove(id: string, user: User): Promise<void> {
    const doc = await this.findOne(id, user);
    await this.generatedDocRepository.remove(doc);
  }
}
