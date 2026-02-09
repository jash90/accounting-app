import {
  ContentBlockType,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SeparatorBlock,
  type SignatureBlock,
  type TableBlock,
} from '@/types/content-blocks';

let nextId = 1;
function generateId(): string {
  return `block_${Date.now()}_${nextId++}`;
}

export const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  [ContentBlockType.PARAGRAPH]: 'Paragraf',
  [ContentBlockType.HEADING]: 'Nagłówek',
  [ContentBlockType.TABLE]: 'Tabela',
  [ContentBlockType.LIST]: 'Lista',
  [ContentBlockType.SEPARATOR]: 'Separator',
  [ContentBlockType.SIGNATURE]: 'Blok podpisów',
  [ContentBlockType.ATTACHMENT_SECTION]: 'Sekcja załącznika',
  [ContentBlockType.CLIENT_DATA]: 'Dane klienta',
};

export function createBlock(type: ContentBlockType, order: number): ContentBlock {
  const base = { id: generateId(), order };

  switch (type) {
    case ContentBlockType.PARAGRAPH:
      return {
        ...base,
        type: ContentBlockType.PARAGRAPH,
        content: [{ text: '' }],
      } as ParagraphBlock;

    case ContentBlockType.HEADING:
      return {
        ...base,
        type: ContentBlockType.HEADING,
        content: [{ text: '' }],
        level: 1,
      } as HeadingBlock;

    case ContentBlockType.TABLE:
      return {
        ...base,
        type: ContentBlockType.TABLE,
        columnCount: 2,
        rows: [{ cells: [{ content: [{ text: '' }] }, { content: [{ text: '' }] }] }],
      } as TableBlock;

    case ContentBlockType.LIST:
      return {
        ...base,
        type: ContentBlockType.LIST,
        style: 'numbered',
        items: [{ content: [{ text: '' }] }],
      } as ListBlock;

    case ContentBlockType.SEPARATOR:
      return {
        ...base,
        type: ContentBlockType.SEPARATOR,
      } as SeparatorBlock;

    case ContentBlockType.SIGNATURE:
      return {
        ...base,
        type: ContentBlockType.SIGNATURE,
        leftLabel: 'Zleceniodawca',
        rightLabel: 'Zleceniobiorca',
      } as SignatureBlock;

    case ContentBlockType.ATTACHMENT_SECTION:
      return {
        ...base,
        type: ContentBlockType.ATTACHMENT_SECTION,
        sectionNumber: 1,
        title: '',
        content: [{ text: '' }],
      } as AttachmentSectionBlock;

    case ContentBlockType.CLIENT_DATA:
      return {
        ...base,
        type: ContentBlockType.CLIENT_DATA,
        fields: [{ label: '', placeholder: '' }],
      } as ClientDataBlock;
  }
}
