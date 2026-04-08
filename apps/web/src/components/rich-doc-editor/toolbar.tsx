// Side-effect imports to load command type augmentations
import '@tiptap/extension-table';
import '@tiptap/extension-text-align';

import { type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  editor: Editor | null;
  disabled?: boolean;
}

export function RichDocEditorToolbar({ editor, disabled = false }: Props) {
  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, Icon: typeof Bold, label: string) => (
    <Button
      type="button"
      size="icon"
      variant={active ? 'secondary' : 'ghost'}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-1 border-b p-1">
      {btn(
        editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run(),
        Bold,
        'Pogrubienie'
      )}
      {btn(
        editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        Italic,
        'Kursywa'
      )}
      {btn(
        editor.isActive('underline'),
        () => editor.chain().focus().toggleUnderline().run(),
        UnderlineIcon,
        'Podkreślenie'
      )}
      {btn(
        editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run(),
        Strikethrough,
        'Przekreślenie'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive('heading', { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        Heading1,
        'Nagłówek 1'
      )}
      {btn(
        editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        Heading2,
        'Nagłówek 2'
      )}
      {btn(
        editor.isActive('heading', { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        Heading3,
        'Nagłówek 3'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        List,
        'Lista punktowana'
      )}
      {btn(
        editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        ListOrdered,
        'Lista numerowana'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive({ textAlign: 'left' }),
        () => editor.chain().focus().setTextAlign('left').run(),
        AlignLeft,
        'Wyrównaj do lewej'
      )}
      {btn(
        editor.isActive({ textAlign: 'center' }),
        () => editor.chain().focus().setTextAlign('center').run(),
        AlignCenter,
        'Wyśrodkuj'
      )}
      {btn(
        editor.isActive({ textAlign: 'right' }),
        () => editor.chain().focus().setTextAlign('right').run(),
        AlignRight,
        'Wyrównaj do prawej'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {(() => {
        const insideTable = editor.isActive('table');
        return (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || insideTable}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            aria-label="Wstaw tabelę"
            title={insideTable ? 'Nie można wstawić tabeli wewnątrz tabeli' : 'Wstaw tabelę'}
            className="h-8 w-8"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        );
      })()}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Cofnij')}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, 'Ponów')}
    </div>
  );
}
