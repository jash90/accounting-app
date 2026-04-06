import { type Control, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { type CreateClientFormData, type UpdateClientFormData } from '@/lib/validation/schemas';
import { type ClientFieldDefinition } from '@/types/entities';


export interface FormSectionProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
}

export interface CustomFieldsCardProps {
  definitions: ClientFieldDefinition[];
  values: Record<string, string>;
  isSubmitted: boolean;
  onFieldChange: (fieldId: string, value: string) => void;
}

export type ClientFormInstance = UseFormReturn<CreateClientFormData | UpdateClientFormData>;
