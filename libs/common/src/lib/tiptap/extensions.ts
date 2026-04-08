import { CharacterCount } from '@tiptap/extension-character-count';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import {
  BackgroundColor,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from '@tiptap/extension-text-style';
import { Typography } from '@tiptap/extension-typography';
import { Underline } from '@tiptap/extension-underline';
import { Youtube } from '@tiptap/extension-youtube';
import { StarterKit } from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { PlaceholderNode } from './placeholder-node';

const lowlight = createLowlight(common);

/**
 * Canonical TipTap extension set used by both the frontend editor and the
 * backend @tiptap/html serialiser. Keeping one array guarantees JSON ↔ HTML
 * round-trips are lossless.
 */
export const tiptapExtensions = [
  StarterKit.configure({
    link: false,
    underline: false,
    // Replaced by CodeBlockLowlight below for syntax highlighting
    codeBlock: false,
  }),
  Underline,
  Subscript,
  Superscript,
  TextStyle,
  FontSize,
  FontFamily,
  LineHeight,
  Color,
  BackgroundColor,
  Highlight.configure({ multicolor: true }),
  Typography,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: 'text-primary underline' },
  }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full' } }),
  Youtube.configure({ HTMLAttributes: { class: 'max-w-full aspect-video' } }),
  CodeBlockLowlight.configure({ lowlight }),
  Details,
  DetailsSummary,
  DetailsContent,
  TaskList,
  TaskItem.configure({ nested: true }),
  Emoji.configure({ emojis: gitHubEmojis, enableEmoticons: true }),
  CharacterCount,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  PlaceholderNode,
];
