import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type HeadingBlock, type HeadingLevel, type TextAlignment } from '@/types/content-blocks';

interface Props {
  block: HeadingBlock;
  onChange: (block: HeadingBlock) => void;
}

export function HeadingBlockEditor({ block, onChange }: Props) {
  const run = block.content[0] || { text: '' };

  const updateText = (text: string) => {
    onChange({ ...block, content: [{ ...run, text }] });
  };

  const setLevel = (level: string) => {
    onChange({ ...block, level: Number(level) as HeadingLevel });
  };

  const setAlignment = (alignment: TextAlignment) => {
    onChange({ ...block, alignment: block.alignment === alignment ? undefined : alignment });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={String(block.level)} onValueChange={setLevel}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button
            variant={block.alignment === 'left' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAlignment('left')}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={block.alignment === 'center' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAlignment('center')}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={block.alignment === 'right' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAlignment('right')}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Input
        value={run.text}
        onChange={(e) => updateText(e.target.value)}
        placeholder="Wpisz tekst nagłówka..."
        className="font-bold"
      />
    </div>
  );
}
