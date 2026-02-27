import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as Handlebars from 'handlebars';
import { Repository } from 'typeorm';

import {
  ContentBlockType,
  DocumentTemplate,
  GeneratedDocument,
  User,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SignatureBlock,
  type TableBlock,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { DocumentPdfService } from './document-pdf.service';
import { GenerateDocumentDto } from '../dto/generated-document.dto';

@Injectable()
export class GeneratedDocumentsService {
  constructor(
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocRepository: Repository<GeneratedDocument>,
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
    private readonly tenantService: TenantService,
    private readonly pdfService: DocumentPdfService
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

    if (template.documentSourceType === 'blocks' && template.contentBlocks?.length) {
      const serialized = this.renderBlocksAsMarkdown(template.contentBlocks);
      try {
        const compiledTemplate = Handlebars.compile(serialized);
        renderedContent = compiledTemplate(dto.placeholderData ?? {});
      } catch {
        renderedContent = serialized;
      }
    } else if (template.templateContent) {
      try {
        const compiledTemplate = Handlebars.compile(template.templateContent);
        renderedContent = compiledTemplate(dto.placeholderData ?? {});
      } catch {
        // If Handlebars compilation fails, store plain template content
        renderedContent = template.templateContent;
      }
    }

    let resolvedBlocks: ContentBlock[] | undefined;
    if (template.documentSourceType === 'blocks' && template.contentBlocks?.length) {
      resolvedBlocks = this.resolveBlockPlaceholders(
        template.contentBlocks,
        dto.placeholderData ?? {}
      );
    }

    const doc = this.generatedDocRepository.create({
      name: dto.name,
      templateId: dto.templateId,
      generatedById: user.id,
      companyId,
      metadata: {
        ...dto.placeholderData,
        renderedContent,
        ...(resolvedBlocks ? { resolvedBlocks } : {}),
      },
      sourceModule: dto.sourceModule,
      sourceEntityId: dto.sourceEntityId,
    });

    return this.generatedDocRepository.save(doc);
  }

  async generatePdf(id: string, user: User): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.findOne(id, user);
    const metadata = doc.metadata as Record<string, unknown> | null;
    const resolvedBlocks = metadata?.resolvedBlocks as ContentBlock[] | undefined;

    let buffer: Buffer;
    if (resolvedBlocks?.length) {
      buffer = await this.pdfService.generatePdfFromBlocks(resolvedBlocks, doc.name);
    } else {
      const text = (metadata?.renderedContent as string) || doc.name;
      buffer = await this.pdfService.generatePdfFromText(text, doc.name);
    }

    const safeName = doc.name.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '');
    return { buffer, filename: `${safeName}.pdf` };
  }

  async getRenderedContent(id: string, user: User): Promise<string> {
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

  private resolveBlockPlaceholders(
    blocks: ContentBlock[],
    data: Record<string, unknown>
  ): ContentBlock[] {
    const cloned: ContentBlock[] = JSON.parse(JSON.stringify(blocks)) as ContentBlock[];
    const compile = (text: string): string => {
      try {
        return Handlebars.compile(text)(data);
      } catch {
        return text;
      }
    };

    for (const block of cloned) {
      switch (block.type) {
        case ContentBlockType.PARAGRAPH: {
          const b = block as ParagraphBlock;
          b.content = b.content.map((r) => ({ ...r, text: compile(r.text) }));
          break;
        }
        case ContentBlockType.HEADING: {
          const b = block as HeadingBlock;
          b.content = b.content.map((r) => ({ ...r, text: compile(r.text) }));
          break;
        }
        case ContentBlockType.TABLE: {
          const b = block as TableBlock;
          if (b.headers) {
            b.headers.cells = b.headers.cells.map((cell) => ({
              ...cell,
              content: cell.content.map((r) => ({ ...r, text: compile(r.text) })),
            }));
          }
          b.rows = b.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
              ...cell,
              content: cell.content.map((r) => ({ ...r, text: compile(r.text) })),
            })),
          }));
          break;
        }
        case ContentBlockType.LIST: {
          const b = block as ListBlock;
          b.items = b.items.map((item) => ({
            ...item,
            content: item.content.map((r) => ({ ...r, text: compile(r.text) })),
          }));
          break;
        }
        case ContentBlockType.SIGNATURE: {
          const b = block as SignatureBlock;
          b.leftLabel = compile(b.leftLabel);
          b.rightLabel = compile(b.rightLabel);
          break;
        }
        case ContentBlockType.ATTACHMENT_SECTION: {
          const b = block as AttachmentSectionBlock;
          b.title = compile(b.title);
          b.content = b.content.map((r) => ({ ...r, text: compile(r.text) }));
          break;
        }
        case ContentBlockType.CLIENT_DATA: {
          const b = block as ClientDataBlock;
          if (b.title) b.title = compile(b.title);
          b.fields = b.fields.map((field) => ({
            ...field,
            placeholder: compile(field.placeholder),
          }));
          break;
        }
        default:
          break;
      }
    }

    return cloned;
  }

  private renderBlocksAsMarkdown(blocks: ContentBlock[]): string {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    return sorted
      .map((block) => {
        switch (block.type) {
          case ContentBlockType.PARAGRAPH:
            return block.content.map((r) => r.text).join('');

          case ContentBlockType.HEADING: {
            const prefix = '#'.repeat(block.level);
            return `${prefix} ${block.content.map((r) => r.text).join('')}`;
          }

          case ContentBlockType.TABLE: {
            const rows: string[] = [];
            if (block.headers) {
              rows.push(
                block.headers.cells.map((c) => c.content.map((r) => r.text).join('')).join(' | ')
              );
              rows.push(block.headers.cells.map(() => '---').join(' | '));
            }
            for (const row of block.rows) {
              rows.push(row.cells.map((c) => c.content.map((r) => r.text).join('')).join(' | '));
            }
            return rows.join('\n');
          }

          case ContentBlockType.LIST: {
            return block.items
              .map((item, idx) => {
                const text = item.content.map((r) => r.text).join('');
                return block.style === 'numbered' ? `${idx + 1}. ${text}` : `- ${text}`;
              })
              .join('\n');
          }

          case ContentBlockType.SEPARATOR:
            return '---';

          case ContentBlockType.SIGNATURE:
            return `${block.leftLabel}                    ${block.rightLabel}`;

          case ContentBlockType.ATTACHMENT_SECTION: {
            const title = `Załącznik ${block.sectionNumber}: ${block.title}`;
            const body = block.content.map((r) => r.text).join('');
            return body ? `${title}\n${body}` : title;
          }

          case ContentBlockType.CLIENT_DATA: {
            const lines: string[] = [];
            if (block.title) lines.push(block.title);
            for (const field of block.fields) {
              lines.push(`${field.label}: {{${field.placeholder}}}`);
            }
            return lines.join('\n');
          }

          default:
            return '';
        }
      })
      .filter(Boolean)
      .join('\n\n');
  }
}
