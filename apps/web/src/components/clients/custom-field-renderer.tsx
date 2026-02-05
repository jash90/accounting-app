import { memo } from 'react';


import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { type ClientFieldDefinition } from '@/types/entities';
import { CustomFieldType } from '@/types/enums';

interface CustomFieldRendererProps {
  definition: ClientFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Unique ID for the input element, used for label association */
  id?: string;
  /** ARIA describedby attribute for accessibility */
  'aria-describedby'?: string;
  /** ARIA invalid attribute for accessibility */
  'aria-invalid'?: boolean;
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
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: CustomFieldRendererProps) {
  const inputId = id || `custom-field-${definition.id}`;
  const ariaProps = {
    ...(ariaDescribedBy && { 'aria-describedby': ariaDescribedBy }),
    ...(ariaInvalid !== undefined && { 'aria-invalid': ariaInvalid }),
  };

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
          {...ariaProps}
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
          {...ariaProps}
        />
      );

    case CustomFieldType.DATE:
      return (
        <DatePicker
          value={value || undefined}
          onChange={(newValue) => onChange(newValue || '')}
          disabled={disabled}
          placeholder={definition.label}
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
            {...ariaProps}
          />
          <span className="text-muted-foreground text-sm" aria-hidden="true">
            {value === 'true' ? 'Tak' : 'Nie'}
          </span>
        </div>
      );

    case CustomFieldType.ENUM:
      return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={inputId} aria-label={definition.label} {...ariaProps}>
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
          {...ariaProps}
        />
      );
  }
});
