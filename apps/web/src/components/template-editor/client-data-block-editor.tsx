import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ClientDataBlock } from '@/types/content-blocks';

interface Props {
  block: ClientDataBlock;
  onChange: (block: ClientDataBlock) => void;
}

export function ClientDataBlockEditor({ block, onChange }: Props) {
  const updateField = (index: number, key: 'label' | 'placeholder', value: string) => {
    const fields = [...block.fields];
    fields[index] = { ...fields[index], [key]: value };
    onChange({ ...block, fields });
  };

  const addField = () => {
    onChange({
      ...block,
      fields: [...block.fields, { label: '', placeholder: '' }],
    });
  };

  const removeField = (index: number) => {
    if (block.fields.length <= 1) return;
    onChange({
      ...block,
      fields: block.fields.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Tytuł sekcji (opcjonalny)</Label>
        <Input
          value={block.title || ''}
          onChange={(e) => onChange({ ...block, title: e.target.value || undefined })}
          placeholder="np. Dane klienta"
        />
      </div>

      <div className="space-y-2">
        {block.fields.map((field, index) => (
          <div key={`field-${index}`} className="flex items-center gap-2">
            <Input
              value={field.label}
              onChange={(e) => updateField(index, 'label', e.target.value)}
              placeholder="Etykieta (np. NIP)"
              className="flex-1"
            />
            <Input
              value={field.placeholder}
              onChange={(e) => updateField(index, 'placeholder', e.target.value)}
              placeholder="Placeholder (np. {{nip}})"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              disabled={block.fields.length <= 1}
              aria-label="Usuń pole"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addField}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj pole
      </Button>
    </div>
  );
}
