import { useEffect } from 'react';

import { EditorContent, useEditor, type Editor } from '@tiptap/react';

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

export function RichDocEditor({
  value,
  onChange,
  placeholders = [],
  disabled = false,
  toolbarSlot,
  onReady,
}: RichDocEditorProps) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value ?? EMPTY_DOC,
    editable: !disabled,
    onUpdate({ editor: ed }) {
      onChange(ed.getJSON() as Record<string, unknown>);
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
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert min-h-[400px] max-w-none p-4 focus-within:outline-none"
      />
    </div>
  );
}
