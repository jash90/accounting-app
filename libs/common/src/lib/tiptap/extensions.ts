import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { StarterKit } from '@tiptap/starter-kit';

import { PlaceholderNode } from './placeholder-node';

/**
 * Canonical TipTap extension set used by both the frontend editor and the
 * backend @tiptap/html serialiser. Keeping one array guarantees JSON ↔ HTML
 * round-trips are lossless.
 */
export const tiptapExtensions = [
  StarterKit.configure({
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: 'text-primary underline' },
  }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  PlaceholderNode,
];
