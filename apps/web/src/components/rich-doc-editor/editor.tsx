import { useEffect, useState } from 'react';

import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';

import { Button } from '@/components/ui/button';

import { tiptapExtensions } from '@accounting/common/browser';

import { RichDocEditorPlaceholderPicker } from './placeholder-picker';
import { RichDocEditorToolbar } from './toolbar';

interface RichDocEditorProps {
  value: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  placeholders?: string[];
  disabled?: boolean;
  toolbarSlot?: React.ReactNode;
  onReady?: (editor: Editor) => void;
}

const EMPTY_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/**
 * Reads a File or DataTransferItem as a base64 data URL so we can paste/drop
 * images straight into the editor without uploading anywhere.
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function RichDocEditor({
  value,
  onChange,
  placeholders = [],
  disabled = false,
  toolbarSlot,
  onReady,
}: RichDocEditorProps) {
  const [stats, setStats] = useState<{ chars: number; words: number }>({ chars: 0, words: 0 });

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value ?? EMPTY_DOC,
    editable: !disabled,
    onUpdate({ editor: ed }) {
      onChange(ed.getJSON() as Record<string, unknown>);
      try {
        // CharacterCount storage is registered by the shared extension array
        const storage = ed.storage['characterCount'] as
          | { characters: () => number; words: () => number }
          | undefined;
        if (storage) {
          setStats({ chars: storage.characters(), words: storage.words() });
        }
      } catch {
        /* ignore */
      }
    },
    editorProps: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        void readFileAsDataURL(file).then((src) => {
          const { schema } = view.state;
          const node = schema.nodes['image']?.create({ src });
          if (!node) return;
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
        });
        return true;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;
        event.preventDefault();
        void Promise.all(files.map(readFileAsDataURL)).then((srcs) => {
          const { schema } = view.state;
          const nodes = srcs
            .map((src) => schema.nodes['image']?.create({ src }))
            .filter((n): n is NonNullable<typeof n> => Boolean(n));
          if (nodes.length === 0) return;
          let tr = view.state.tr;
          nodes.forEach((node) => {
            tr = tr.replaceSelectionWith(node);
          });
          view.dispatch(tr);
        });
        return true;
      },
    },
  });

  // Notify parent once the editor instance is ready (used to wire ImportDocxButton).
  useEffect(() => {
    if (editor && onReady) onReady(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // When the parent replaces the whole document (e.g. on import or initial load),
  // push it into the editor without breaking history.
  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value as never, { emitUpdate: false });
    }
     
  }, [value, editor]);

  return (
    <div className="bg-background rich-doc-editor overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b">
        <RichDocEditorToolbar editor={editor} disabled={disabled} />
        <div className="flex items-center gap-2 pr-2">
          <RichDocEditorPlaceholderPicker
            editor={editor}
            placeholders={placeholders}
            disabled={disabled}
          />
          {toolbarSlot}
        </div>
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          className="bg-popover flex items-center gap-1 rounded-md border p-1 shadow-md"
        >
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="h-7 px-2 text-xs font-bold"
          >
            B
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="h-7 px-2 text-xs italic"
          >
            I
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className="h-7 px-2 text-xs underline"
          >
            U
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            onClick={() => {
              const previous = editor.getAttributes('link')['href'] as string | undefined;
              const url = window.prompt('URL:', previous ?? 'https://');
              if (url === null) return;
              if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
              else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }}
            className="h-7 px-2 text-xs"
          >
            🔗
          </Button>
        </BubbleMenu>
      )}

      {editor && (
        <FloatingMenu
          editor={editor}
          options={{ placement: 'left-start' }}
          className="bg-popover flex items-center gap-1 rounded-md border p-1 shadow-md"
        >
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="h-7 px-2 text-xs"
            title="Nagłówek 1"
          >
            H1
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="h-7 px-2 text-xs"
            title="Nagłówek 2"
          >
            H2
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-7 px-2 text-xs"
            title="Lista"
          >
            • —
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            className="h-7 px-2 text-xs"
            title="Tabela"
          >
            ⊞
          </Button>
        </FloatingMenu>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert min-h-[400px] max-w-none p-4 focus-within:outline-none"
      />

      <div className="text-muted-foreground bg-muted/30 flex items-center justify-between border-t px-3 py-1 text-xs">
        <span>
          Wskazówka: wklej obraz Ctrl+V, aby go wstawić · Tab w tabeli przechodzi między komórkami
        </span>
        <span>
          {stats.words} słów · {stats.chars} znaków
        </span>
      </div>
    </div>
  );
}
