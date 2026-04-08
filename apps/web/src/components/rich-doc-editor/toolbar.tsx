// Side-effect imports to load command type augmentations
import '@tiptap/extension-character-count';
import '@tiptap/extension-code-block-lowlight';
import '@tiptap/extension-color';
import '@tiptap/extension-details';
import '@tiptap/extension-emoji';
import '@tiptap/extension-highlight';
import '@tiptap/extension-subscript';
import '@tiptap/extension-superscript';
import '@tiptap/extension-table';
import '@tiptap/extension-task-item';
import '@tiptap/extension-task-list';
import '@tiptap/extension-text-align';
import '@tiptap/extension-text-style';
import '@tiptap/extension-typography';
import '@tiptap/extension-youtube';

import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Code2,
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
  ListChecks,
  ListOrdered,
  Minus,
  PaintBucket,
  Pilcrow,
  Quote,
  Redo,
  Rows3,
  Smile,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const FONT_FAMILIES = [
  { label: 'Domyślna', value: '' },
  { label: 'Sans-serif', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'ui-serif, Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, monospace' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5'];

const POPULAR_EMOJIS = ['👍', '❤️', '🎉', '✅', '⚠️', '📌', '💡', '🔥', '⭐', '📎', '📝', '✨'];

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
        taskList: ed.isActive('taskList'),
        blockquote: ed.isActive('blockquote'),
        codeBlock: ed.isActive('codeBlock'),
        details: ed.isActive('details'),
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

  /**
   * Wrap a trigger element in a Radix Tooltip. Disabled buttons don't fire
   * pointer events, so we wrap them in a span to keep tooltips working. The
   * span wrapper is used for both states because TooltipTrigger asChild
   * clones its child to inject aria-describedby — and React.Fragment can't
   * accept props.
   */
  const withTooltip = (trigger: React.ReactElement, label: string, _isDisabled = false) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  const iconBtn = (active: boolean, onClick: () => void, Icon: typeof Bold, label: string) =>
    withTooltip(
      <Button
        type="button"
        size="icon"
        variant={active ? 'secondary' : 'ghost'}
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        className="h-8 w-8"
      >
        <Icon className="h-4 w-4" />
      </Button>,
      label,
      disabled
    );

  /** Wrap a DropdownMenuTrigger button with a Radix tooltip via nested asChild. */
  const tooltipDropdownTrigger = (button: React.ReactElement, label: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
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
    <TooltipProvider delayDuration={300}>
      <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b p-1">
        {/* Paragraph format dropdown */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-8 min-w-[6rem] justify-between gap-1 px-2 text-xs"
            >
              <Pilcrow className="h-3.5 w-3.5" />
              <span className="truncate">{currentParagraphLabel}</span>
            </Button>,
            'Styl akapitu'
          )}
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

        {/* Font family */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-8 gap-1 px-2 text-xs"
            >
              <Type className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>,
            'Krój pisma'
          )}
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Krój pisma</DropdownMenuLabel>
            {FONT_FAMILIES.map((f) => (
              <DropdownMenuItem
                key={f.label}
                onSelect={() => {
                  if (!f.value) editor.chain().focus().unsetFontFamily().run();
                  else editor.chain().focus().setFontFamily(f.value).run();
                }}
              >
                <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font size */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-8 gap-1 px-2 text-xs"
            >
              <span className="text-xs font-bold">A</span>
              <ChevronDown className="h-3 w-3" />
            </Button>,
            'Rozmiar czcionki'
          )}
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

        {/* Line height */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-8 gap-1 px-2 text-xs"
            >
              ≡
              <ChevronDown className="h-3 w-3" />
            </Button>,
            'Interlinia'
          )}
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Interlinia</DropdownMenuLabel>
            {LINE_HEIGHTS.map((lh) => (
              <DropdownMenuItem
                key={lh}
                onSelect={() => editor.chain().focus().setLineHeight(lh).run()}
              >
                {lh}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => editor.chain().focus().unsetLineHeight().run()}>
              Domyślna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Bold/italic/underline/strike */}
        {iconBtn(state.bold, () => editor.chain().focus().toggleBold().run(), Bold, 'Pogrubienie')}
        {iconBtn(
          state.italic,
          () => editor.chain().focus().toggleItalic().run(),
          Italic,
          'Kursywa'
        )}
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
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              className="h-8 w-8"
              aria-label="Kolor tekstu"
            >
              <span className="border-foreground/30 flex h-4 w-4 items-center justify-center border-b-2 text-xs font-bold">
                A
              </span>
            </Button>,
            'Kolor tekstu'
          )}
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
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              className="h-8 w-8"
              aria-label="Wyróżnienie"
            >
              <Highlighter className="h-4 w-4" />
            </Button>,
            'Wyróżnienie'
          )}
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

        {/* Background colour (different from highlight: applies via TextStyle mark) */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              className="h-8 w-8"
              aria-label="Tło tekstu"
            >
              <PaintBucket className="h-4 w-4" />
            </Button>,
            'Tło tekstu'
          )}
          <DropdownMenuContent align="start" className="p-2">
            <DropdownMenuLabel className="text-xs">Tło tekstu</DropdownMenuLabel>
            <div className="grid grid-cols-6 gap-1 p-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => editor.chain().focus().setBackgroundColor(c).run()}
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: c }}
                  aria-label={`Tło ${c}`}
                />
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => editor.chain().focus().unsetBackgroundColor().run()}>
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
        {iconBtn(
          state.taskList,
          () => editor.chain().focus().toggleTaskList().run(),
          ListChecks,
          'Lista zadań'
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

        {/* Insert: link / image / table / details / code block / hr */}
        {iconBtn(state.link, setLink, LinkIcon, 'Wstaw link')}
        {iconBtn(false, setImage, ImageIcon, 'Wstaw obraz')}
        {withTooltip(
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || state.insideTable}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            aria-label="Wstaw tabelę"
            className="h-8 w-8"
          >
            <TableIcon className="h-4 w-4" />
          </Button>,
          state.insideTable ? 'Nie można wstawić tabeli wewnątrz tabeli' : 'Wstaw tabelę',
          disabled || state.insideTable
        )}
        {iconBtn(
          state.codeBlock,
          () => editor.chain().focus().toggleCodeBlock().run(),
          Code2,
          'Blok kodu'
        )}
        {iconBtn(
          state.details,
          () => editor.chain().focus().setDetails().run(),
          ChevronDown,
          'Sekcja składana'
        )}
        {iconBtn(
          false,
          () => editor.chain().focus().setHorizontalRule().run(),
          Minus,
          'Pozioma linia'
        )}

        {/* Emoji picker */}
        <DropdownMenu>
          {tooltipDropdownTrigger(
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={disabled}
              className="h-8 w-8"
              aria-label="Wstaw emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>,
            'Wstaw emoji'
          )}
          <DropdownMenuContent align="start" className="p-2">
            <DropdownMenuLabel className="text-xs">Emoji</DropdownMenuLabel>
            <div className="grid grid-cols-6 gap-1 p-1 text-lg">
              {POPULAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => editor.chain().focus().insertContent(e).run()}
                  className="hover:bg-muted h-7 w-7 rounded"
                >
                  {e}
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Contextual table-edit buttons */}
        {state.insideTable && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            {withTooltip(
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Rows3 className="h-3.5 w-3.5" />+ wiersz
              </Button>,
              'Dodaj wiersz poniżej',
              disabled
            )}
            {withTooltip(
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Columns3 className="h-3.5 w-3.5" />+ kolumna
              </Button>,
              'Dodaj kolumnę po prawej',
              disabled
            )}
            {withTooltip(
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Rows3 className="h-3.5 w-3.5" />− wiersz
              </Button>,
              'Usuń wiersz',
              disabled
            )}
            {withTooltip(
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="h-8 gap-1 px-2 text-xs"
              >
                <Columns3 className="h-3.5 w-3.5" />− kolumna
              </Button>,
              'Usuń kolumnę',
              disabled
            )}
            {withTooltip(
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled}
                onClick={() => editor.chain().focus().deleteTable().run()}
                aria-label="Usuń tabelę"
                className="text-destructive h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>,
              'Usuń tabelę',
              disabled
            )}
          </>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Undo / Redo */}
        {iconBtn(false, () => editor.chain().focus().undo().run(), Undo, 'Cofnij')}
        {iconBtn(false, () => editor.chain().focus().redo().run(), Redo, 'Ponów')}
      </div>
    </TooltipProvider>
  );
}
