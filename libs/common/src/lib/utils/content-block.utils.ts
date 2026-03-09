import * as Handlebars from 'handlebars';

import {
  ContentBlockType,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SignatureBlock,
  type TableBlock,
} from '../types/content-block.types';

/**
 * Deep-clone content blocks and resolve Handlebars placeholders in all text fields.
 *
 * Shared by GeneratedDocumentsService and DemoDataSeederService.
 */
export function resolveBlockPlaceholders(
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
          placeholder: compile(`{{${field.placeholder}}}`),
        }));
        break;
      }
      default:
        break;
    }
  }

  return cloned;
}
