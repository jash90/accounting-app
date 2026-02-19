import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ListBlock, type ListStyle } from '@/types/content-blocks';

interface Props {
  block: ListBlock;
  onChange: (block: ListBlock) => void;
}

export function ListBlockEditor({ block, onChange }: Props) {
  const setStyle = (style: string) => {
    onChange({ ...block, style: style as ListStyle });
  };

  const updateItem = (index: number, text: string) => {
    const items = [...block.items];
    items[index] = { content: [{ text }] };
    onChange({ ...block, items });
  };

  const addItem = () => {
    onChange({ ...block, items: [...block.items, { content: [{ text: '' }] }] });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const items = block.items.filter((_, i) => i !== index);
    onChange({ ...block, items });
  };

  return (
    <div className="space-y-2">
      <Select value={block.style} onValueChange={setStyle}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="numbered">Numerowana</SelectItem>
          <SelectItem value="bulleted">Punktowana</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-1">
        {block.items.map((item, index) => (
          <div key={`list-item-${index}`} className="flex items-center gap-2">
            <span className="text-muted-foreground w-6 text-sm text-right">
              {block.style === 'numbered' ? `${index + 1}.` : '\u2022'}
            </span>
            <Input
              value={item.content[0]?.text || ''}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="Treść elementu..."
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              disabled={block.items.length <= 1}
              aria-label="Usuń element"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj element
      </Button>
    </div>
  );
}
