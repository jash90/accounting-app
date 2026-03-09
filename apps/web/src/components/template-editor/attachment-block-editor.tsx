
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AttachmentSectionBlock } from '@/types/content-blocks';

interface Props {
  block: AttachmentSectionBlock;
  onChange: (block: AttachmentSectionBlock) => void;
}

export function AttachmentBlockEditor({ block, onChange }: Props) {
  const run = block.content[0] || { text: '' };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="w-24">
          <Label className="text-sm">Nr sekcji</Label>
          <Input
            type="number"
            min={1}
            value={block.sectionNumber}
            onChange={(e) => onChange({ ...block, sectionNumber: Number(e.target.value) || 1 })}
            className="h-8"
          />
        </div>
        <div className="flex-1">
          <Label className="text-sm">Tytuł załącznika</Label>
          <Input
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Tytuł załącznika..."
          />
        </div>
      </div>
      <Label className="text-sm">Treść</Label>
      <Textarea
        value={run.text}
        onChange={(e) => onChange({ ...block, content: [{ ...run, text: e.target.value }] })}
        placeholder="Treść sekcji załącznika..."
        rows={3}
      />
    </div>
  );
}
