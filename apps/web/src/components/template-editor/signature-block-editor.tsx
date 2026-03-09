
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type SignatureBlock } from '@/types/content-blocks';

interface Props {
  block: SignatureBlock;
  onChange: (block: SignatureBlock) => void;
}

export function SignatureBlockEditor({ block, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm">Lewa etykieta</Label>
        <Input
          value={block.leftLabel}
          onChange={(e) => onChange({ ...block, leftLabel: e.target.value })}
          placeholder="np. Zleceniodawca"
        />
        <Label className="text-sm">Lewy placeholder</Label>
        <Input
          value={block.leftPlaceholder || ''}
          onChange={(e) => onChange({ ...block, leftPlaceholder: e.target.value || undefined })}
          placeholder="np. {{osoba_kontaktowa}}"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Prawa etykieta</Label>
        <Input
          value={block.rightLabel}
          onChange={(e) => onChange({ ...block, rightLabel: e.target.value })}
          placeholder="np. Zleceniobiorca"
        />
        <Label className="text-sm">Prawy placeholder</Label>
        <Input
          value={block.rightPlaceholder || ''}
          onChange={(e) => onChange({ ...block, rightPlaceholder: e.target.value || undefined })}
          placeholder="np. {{osoba_odpowiedzialna}}"
        />
      </div>
    </div>
  );
}
