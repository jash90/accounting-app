import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { type ContentBlock } from '@/types/content-blocks';

import { BlockRenderer } from './block-renderer';
import { BLOCK_TYPE_LABELS } from './block-types';

interface Props {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onBlockClick?: (blockId: string) => void;
}

export function BlockList({ blocks, onChange, onBlockClick }: Props) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    // Re-assign order values
    onChange(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    onChange(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  const updateBlock = (index: number, updated: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    onChange(newBlocks);
  };

  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
        <p className="text-muted-foreground">
          Brak bloków treści. Kliknij &ldquo;Dodaj blok&rdquo; aby rozpocząć budowanie szablonu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <Card
          key={block.id}
          className={onBlockClick ? 'cursor-pointer' : ''}
          onClick={() => onBlockClick?.(block.id)}
        >
          <CardHeader className="flex flex-row items-center justify-between py-2 px-4">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {BLOCK_TYPE_LABELS[block.type]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label="Przesuń w górę"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveDown(index)}
                disabled={index === blocks.length - 1}
                aria-label="Przesuń w dół"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeBlock(index)}
                aria-label="Usuń blok"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <BlockRenderer block={block} onChange={(updated) => updateBlock(index, updated)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
