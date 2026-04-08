// Side-effect imports to load command type augmentations
import '@tiptap/extension-table';
import '@tiptap/extension-text-align';

import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
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
  // Subscribe to editor state so the toolbar re-renders on selection / formatting
  // changes (otherwise active markers and the in-table-only buttons don't update).
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        strike: ed.isActive('strike'),
        h1: ed.isActive('heading', { level: 1 }),
        h2: ed.isActive('heading', { level: 2 }),
        h3: ed.isActive('heading', { level: 3 }),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        alignLeft: ed.isActive({ textAlign: 'left' }),
        alignCenter: ed.isActive({ textAlign: 'center' }),
        alignRight: ed.isActive({ textAlign: 'right' }),
        insideTable: ed.isActive('table'),
      };
    },
  });

  if (!editor || !state) return null;

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
      {btn(state.bold, () => editor.chain().focus().toggleBold().run(), Bold, 'Pogrubienie')}
      {btn(state.italic, () => editor.chain().focus().toggleItalic().run(), Italic, 'Kursywa')}
      {btn(
        state.underline,
        () => editor.chain().focus().toggleUnderline().run(),
        UnderlineIcon,
        'Podkreślenie'
      )}
      {btn(
        state.strike,
        () => editor.chain().focus().toggleStrike().run(),
        Strikethrough,
        'Przekreślenie'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        state.h1,
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        Heading1,
        'Nagłówek 1'
      )}
      {btn(
        state.h2,
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        Heading2,
        'Nagłówek 2'
      )}
      {btn(
        state.h3,
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        Heading3,
        'Nagłówek 3'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        state.bulletList,
        () => editor.chain().focus().toggleBulletList().run(),
        List,
        'Lista punktowana'
      )}
      {btn(
        state.orderedList,
        () => editor.chain().focus().toggleOrderedList().run(),
        ListOrdered,
        'Lista numerowana'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        state.alignLeft,
        () => editor.chain().focus().setTextAlign('left').run(),
        AlignLeft,
        'Wyrównaj do lewej'
      )}
      {btn(
        state.alignCenter,
        () => editor.chain().focus().setTextAlign('center').run(),
        AlignCenter,
        'Wyśrodkuj'
      )}
      {btn(
        state.alignRight,
        () => editor.chain().focus().setTextAlign('right').run(),
        AlignRight,
        'Wyrównaj do prawej'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || state.insideTable}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        aria-label="Wstaw tabelę"
        title={state.insideTable ? 'Nie można wstawić tabeli wewnątrz tabeli' : 'Wstaw tabelę'}
        className="h-8 w-8"
      >
        <TableIcon className="h-4 w-4" />
      </Button>
      {state.insideTable && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Dodaj wiersz poniżej"
            className="h-8 gap-1 px-2"
          >
            <Rows3 className="h-4 w-4" />
            <span className="text-xs">+ wiersz</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Dodaj kolumnę po prawej"
            className="h-8 gap-1 px-2"
          >
            <Columns3 className="h-4 w-4" />
            <span className="text-xs">+ kolumna</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Usuń wiersz"
            className="h-8 gap-1 px-2"
          >
            <Rows3 className="h-4 w-4" />
            <span className="text-xs">− wiersz</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Usuń kolumnę"
            className="h-8 gap-1 px-2"
          >
            <Columns3 className="h-4 w-4" />
            <span className="text-xs">− kolumna</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteTable().run()}
            aria-label="Usuń tabelę"
            title="Usuń tabelę"
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Cofnij')}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, 'Ponów')}
    </div>
  );
}
