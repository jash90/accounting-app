import { ContentBlockType, type ContentBlock } from '@/types/content-blocks';

import { AttachmentBlockEditor } from './attachment-block-editor';
import { ClientDataBlockEditor } from './client-data-block-editor';
import { HeadingBlockEditor } from './heading-block-editor';
import { ListBlockEditor } from './list-block-editor';
import { ParagraphBlockEditor } from './paragraph-block-editor';
import { SeparatorBlockEditor } from './separator-block-editor';
import { SignatureBlockEditor } from './signature-block-editor';
import { TableBlockEditor } from './table-block-editor';

interface Props {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
}

export function BlockRenderer({ block, onChange }: Props) {
  switch (block.type) {
    case ContentBlockType.PARAGRAPH:
      return <ParagraphBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.HEADING:
      return <HeadingBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.TABLE:
      return <TableBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.LIST:
      return <ListBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.SEPARATOR:
      return <SeparatorBlockEditor />;
    case ContentBlockType.SIGNATURE:
      return <SignatureBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.ATTACHMENT_SECTION:
      return <AttachmentBlockEditor block={block} onChange={onChange} />;
    case ContentBlockType.CLIENT_DATA:
      return <ClientDataBlockEditor block={block} onChange={onChange} />;
    default:
      return null;
  }
}
