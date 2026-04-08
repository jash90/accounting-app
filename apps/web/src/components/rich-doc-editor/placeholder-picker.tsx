// Side-effect import to load PlaceholderNode command type augmentation
import '@accounting/common/browser';

import { type Editor } from '@tiptap/react';
import { Braces } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  editor: Editor | null;
  placeholders: string[];
  disabled?: boolean;
}

export function RichDocEditorPlaceholderPicker({ editor, placeholders, disabled }: Props) {
  if (!editor || placeholders.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Braces className="mr-1.5 h-4 w-4" />
          Wstaw placeholder
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
        {placeholders.map((key) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => editor.chain().focus().insertPlaceholder(key).run()}
          >
            <code className="text-xs">{`{{${key}}}`}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
