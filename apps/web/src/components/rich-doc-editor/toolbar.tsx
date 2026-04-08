// Side-effect imports to load command type augmentations
import '@tiptap/extension-color';
import '@tiptap/extension-highlight';
import '@tiptap/extension-subscript';
import '@tiptap/extension-superscript';
import '@tiptap/extension-table';
import '@tiptap/extension-text-align';
import '@tiptap/extension-text-style';

import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Columns3,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo,
  Rows3,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface Props {
  editor: Editor | null;
  disabled?: boolean;
}

const TEXT_COLORS = [
  '#000000',
  '#525252',
  '#a3a3a3',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#db2777',
];

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#fed7aa',
  '#fecaca',
  '#bbf7d0',
  '#bae6fd',
  '#ddd6fe',
  '#fbcfe8',
  '#e5e7eb',
];

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '24px', '32px'];

export function RichDocEditorToolbar({ editor, disabled = false }: Props) {
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
        sub: ed.isActive('subscript'),
        sup: ed.isActive('superscript'),
        code: ed.isActive('code'),
        h1: ed.isActive('heading', { level: 1 }),
        h2: ed.isActive('heading', { level: 2 }),
        h3: ed.isActive('heading', { level: 3 }),
        paragraph: ed.isActive('paragraph') && !ed.isActive('heading'),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        blockquote: ed.isActive('blockquote'),
        codeBlock: ed.isActive('codeBlock'),
        link: ed.isActive('link'),
        alignLeft: ed.isActive({ textAlign: 'left' }),
        alignCenter: ed.isActive({ textAlign: 'center' }),
        alignRight: ed.isActive({ textAlign: 'right' }),
        alignJustify: ed.isActive({ textAlign: 'justify' }),
        insideTable: ed.isActive('table'),
      };
    },
  });

  if (!editor || !state) return null;

  const iconBtn = (active: boolean, onClick: () => void, Icon: typeof Bold, label: string) => (
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

  const setLink = () => {
    const previous = editor.getAttributes('link')['href'] as string | undefined;
    const url = window.prompt('Adres URL linku:', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setImage = () => {
    const url = window.prompt('Adres URL obrazu:');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const currentParagraphLabel = state.h1
    ? 'Nagłówek 1'
    : state.h2
      ? 'Nagłówek 2'
      : state.h3
        ? 'Nagłówek 3'
        : state.blockquote
          ? 'Cytat'
          : state.codeBlock
            ? 'Kod'
            : 'Akapit';

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b p-1">
      {/* Paragraph format dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="h-8 min-w-[6rem] justify-between gap-1 px-2 text-xs"
            title="Styl akapitu"
          >
            <Pilcrow className="h-3.5 w-3.5" />
            <span className="truncate">{currentParagraphLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => editor.chain().focus().setParagraph().run()}>
            <Pilcrow className="mr-2 h-4 w-4" /> Akapit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="mr-2 h-4 w-4" /> Nagłówek 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="mr-2 h-4 w-4" /> Nagłówek 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="mr-2 h-4 w-4" /> Nagłówek 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="mr-2 h-4 w-4" /> Cytat
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code className="mr-2 h-4 w-4" /> Blok kodu
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="h-8 gap-1 px-2 text-xs"
            title="Rozmiar czcionki"
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs">Rozmiar</DropdownMenuLabel>
          {FONT_SIZES.map((sz) => (
            <DropdownMenuItem
              key={sz}
              onSelect={() => editor.chain().focus().setFontSize(sz).run()}
            >
              <span style={{ fontSize: sz }}>{sz}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetFontSize().run()}>
            Domyślny
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Bold/italic/underline/strike */}
      {iconBtn(state.bold, () => editor.chain().focus().toggleBold().run(), Bold, 'Pogrubienie')}
      {iconBtn(state.italic, () => editor.chain().focus().toggleItalic().run(), Italic, 'Kursywa')}
      {iconBtn(
        state.underline,
        () => editor.chain().focus().toggleUnderline().run(),
        UnderlineIcon,
        'Podkreślenie'
      )}
      {iconBtn(
        state.strike,
        () => editor.chain().focus().toggleStrike().run(),
        Strikethrough,
        'Przekreślenie'
      )}

      {/* Sub/sup */}
      {iconBtn(
        state.sub,
        () => editor.chain().focus().toggleSubscript().run(),
        SubIcon,
        'Indeks dolny'
      )}
      {iconBtn(
        state.sup,
        () => editor.chain().focus().toggleSuperscript().run(),
        SupIcon,
        'Indeks górny'
      )}

      {/* Inline code */}
      {iconBtn(state.code, () => editor.chain().focus().toggleCode().run(), Code, 'Kod inline')}

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Text color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="h-8 w-8"
            title="Kolor tekstu"
            aria-label="Kolor tekstu"
          >
            <span className="border-foreground/30 flex h-4 w-4 items-center justify-center border-b-2 text-xs font-bold">
              A
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="p-2">
          <DropdownMenuLabel className="text-xs">Kolor tekstu</DropdownMenuLabel>
          <div className="grid grid-cols-6 gap-1 p-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => editor.chain().focus().setColor(c).run()}
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: c }}
                aria-label={`Kolor ${c}`}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetColor().run()}>
            Wyczyść kolor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Highlight */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="h-8 w-8"
            title="Wyróżnienie"
            aria-label="Wyróżnienie"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="p-2">
          <DropdownMenuLabel className="text-xs">Wyróżnienie</DropdownMenuLabel>
          <div className="grid grid-cols-4 gap-1 p-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: c }}
                aria-label={`Wyróżnienie ${c}`}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().unsetHighlight().run()}>
            Wyczyść
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear formatting */}
      {iconBtn(
        false,
        () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
        Eraser,
        'Wyczyść formatowanie'
      )}

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Lists */}
      {iconBtn(
        state.bulletList,
        () => editor.chain().focus().toggleBulletList().run(),
        List,
        'Lista punktowana'
      )}
      {iconBtn(
        state.orderedList,
        () => editor.chain().focus().toggleOrderedList().run(),
        ListOrdered,
        'Lista numerowana'
      )}

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Alignment */}
      {iconBtn(
        state.alignLeft,
        () => editor.chain().focus().setTextAlign('left').run(),
        AlignLeft,
        'Wyrównaj do lewej'
      )}
      {iconBtn(
        state.alignCenter,
        () => editor.chain().focus().setTextAlign('center').run(),
        AlignCenter,
        'Wyśrodkuj'
      )}
      {iconBtn(
        state.alignRight,
        () => editor.chain().focus().setTextAlign('right').run(),
        AlignRight,
        'Wyrównaj do prawej'
      )}
      {iconBtn(
        state.alignJustify,
        () => editor.chain().focus().setTextAlign('justify').run(),
        AlignJustify,
        'Wyjustuj'
      )}

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Insert: link / image / table / hr */}
      {iconBtn(state.link, setLink, LinkIcon, 'Wstaw link')}
      {iconBtn(false, setImage, ImageIcon, 'Wstaw obraz')}
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
      {iconBtn(
        false,
        () => editor.chain().focus().setHorizontalRule().run(),
        Minus,
        'Pozioma linia'
      )}

      {/* Contextual table-edit buttons */}
      {state.insideTable && (
        <>
          <Separator orientation="vertical" className="mx-0.5 h-6" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Dodaj wiersz poniżej"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Rows3 className="h-3.5 w-3.5" />+ wiersz
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Dodaj kolumnę po prawej"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Columns3 className="h-3.5 w-3.5" />+ kolumna
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Usuń wiersz"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Rows3 className="h-3.5 w-3.5" />− wiersz
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Usuń kolumnę"
            className="h-8 gap-1 px-2 text-xs"
          >
            <Columns3 className="h-3.5 w-3.5" />− kolumna
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            onClick={() => editor.chain().focus().deleteTable().run()}
            aria-label="Usuń tabelę"
            title="Usuń tabelę"
            className="text-destructive h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      {/* Undo / Redo */}
      {iconBtn(false, () => editor.chain().focus().undo().run(), Undo, 'Cofnij')}
      {iconBtn(false, () => editor.chain().focus().redo().run(), Redo, 'Ponów')}
    </div>
  );
}
