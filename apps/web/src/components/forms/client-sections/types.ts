import { type Control, type FieldValues } from 'react-hook-form';

import { type ClientFieldDefinition } from '@/types/entities';

export interface FormSectionProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
}

export interface CustomFieldsCardProps {
  definitions: ClientFieldDefinition[];
  values: Record<string, string>;
  isSubmitted: boolean;
  renderField: (definition: ClientFieldDefinition) => React.ReactNode;
}
