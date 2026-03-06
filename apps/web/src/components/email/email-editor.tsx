import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { EmailEditorToolbar } from './email-editor-toolbar';

interface EmailEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmailEditor({
  content = '',
  onChange,
  onTextChange,
  placeholder = 'Wpisz treść wiadomości...',
  disabled = false,
}: EmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !disabled,
    onUpdate({ editor: ed }) {
      onChange?.(ed.getHTML());
      onTextChange?.(ed.getText());
    },
  });

  return (
    <div className="rounded-md border">
      {editor && <EmailEditorToolbar editor={editor} disabled={disabled} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-3 focus-within:outline-none"
      />
    </div>
  );
}
