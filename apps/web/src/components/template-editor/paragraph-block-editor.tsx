import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type ParagraphBlock, type TextAlignment } from '@/types/content-blocks';

interface Props {
  block: ParagraphBlock;
  onChange: (block: ParagraphBlock) => void;
}

export function ParagraphBlockEditor({ block, onChange }: Props) {
  const run = block.content[0] || { text: '' };

  const updateText = (text: string) => {
    onChange({ ...block, content: [{ ...run, text }] });
  };

  const toggleFormat = (key: 'bold' | 'italic' | 'underline') => {
    onChange({ ...block, content: [{ ...run, [key]: !run[key] }] });
  };

  const setAlignment = (alignment: TextAlignment) => {
    onChange({ ...block, alignment: block.alignment === alignment ? undefined : alignment });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button
          variant={run.bold ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => toggleFormat('bold')}
          aria-label="Pogrubienie"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={run.italic ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => toggleFormat('italic')}
          aria-label="Kursywa"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={run.underline ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => toggleFormat('underline')}
          aria-label="Podkreślenie"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="mx-1 w-px bg-border" />
        <Button
          variant={block.alignment === 'left' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('left')}
          aria-label="Do lewej"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={block.alignment === 'center' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('center')}
          aria-label="Do środka"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={block.alignment === 'right' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('right')}
          aria-label="Do prawej"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant={block.alignment === 'justify' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAlignment('justify')}
          aria-label="Wyjustuj"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={run.text}
        onChange={(e) => updateText(e.target.value)}
        placeholder="Wpisz treść paragrafu..."
        rows={3}
      />
    </div>
  );
}
