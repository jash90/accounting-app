export enum ContentBlockType {
  PARAGRAPH = 'paragraph',
  HEADING = 'heading',
  TABLE = 'table',
  LIST = 'list',
  SEPARATOR = 'separator',
  SIGNATURE = 'signature',
  ATTACHMENT_SECTION = 'attachment_section',
  CLIENT_DATA = 'client_data',
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type HeadingLevel = 1 | 2 | 3;
export type ListStyle = 'numbered' | 'bulleted';

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  order: number;
}

export interface ParagraphBlock extends BaseContentBlock {
  type: ContentBlockType.PARAGRAPH;
  content: TextRun[];
  alignment?: TextAlignment;
}

export interface HeadingBlock extends BaseContentBlock {
  type: ContentBlockType.HEADING;
  content: TextRun[];
  level: HeadingLevel;
  alignment?: TextAlignment;
}

export interface TableCell {
  content: TextRun[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableBlock extends BaseContentBlock {
  type: ContentBlockType.TABLE;
  headers?: TableRow;
  rows: TableRow[];
  columnCount: number;
}

export interface ListItem {
  content: TextRun[];
}

export interface ListBlock extends BaseContentBlock {
  type: ContentBlockType.LIST;
  style: ListStyle;
  items: ListItem[];
}

export interface SeparatorBlock extends BaseContentBlock {
  type: ContentBlockType.SEPARATOR;
}

export interface SignatureBlock extends BaseContentBlock {
  type: ContentBlockType.SIGNATURE;
  leftLabel: string;
  rightLabel: string;
  leftPlaceholder?: string;
  rightPlaceholder?: string;
}

export interface AttachmentSectionBlock extends BaseContentBlock {
  type: ContentBlockType.ATTACHMENT_SECTION;
  sectionNumber: number;
  title: string;
  content: TextRun[];
}

export interface ClientDataField {
  label: string;
  placeholder: string;
}

export interface ClientDataBlock extends BaseContentBlock {
  type: ContentBlockType.CLIENT_DATA;
  title?: string;
  fields: ClientDataField[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | TableBlock
  | ListBlock
  | SeparatorBlock
  | SignatureBlock
  | AttachmentSectionBlock
  | ClientDataBlock;
