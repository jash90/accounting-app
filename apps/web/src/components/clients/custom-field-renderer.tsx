import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomFieldType } from '@/types/enums';
import { ClientFieldDefinition } from '@/types/entities';

interface CustomFieldRendererProps {
  definition: ClientFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Unique ID for the input element, used for label association */
  id?: string;
}

/**
 * Shared component for rendering custom field inputs based on field type.
 * Used in both ClientFormDialog and ClientCreatePage to avoid code duplication.
 */
export const CustomFieldRenderer = memo(function CustomFieldRenderer({
  definition,
  value,
  onChange,
  disabled = false,
  id,
}: CustomFieldRendererProps) {
  const inputId = id || `custom-field-${definition.id}`;

  switch (definition.fieldType) {
    case CustomFieldType.TEXT:
      return (
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.label}
          disabled={disabled}
          aria-label={definition.label}
        />
      );

    case CustomFieldType.NUMBER:
      return (
        <Input
          id={inputId}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.label}
          disabled={disabled}
          aria-label={definition.label}
        />
      );

    case CustomFieldType.DATE:
      return (
        <Input
          id={inputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={definition.label}
        />
      );

    case CustomFieldType.BOOLEAN:
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={inputId}
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(String(checked))}
            disabled={disabled}
            aria-label={definition.label}
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {value === 'true' ? 'Tak' : 'Nie'}
          </span>
        </div>
      );

    case CustomFieldType.ENUM:
      return (
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={inputId} aria-label={definition.label}>
            <SelectValue placeholder="Wybierz..." />
          </SelectTrigger>
          <SelectContent>
            {definition.enumValues?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    default:
      return (
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.label}
          disabled={disabled}
          aria-label={definition.label}
        />
      );
  }
});
