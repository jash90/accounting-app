import { useCallback } from 'react';

import { CustomFieldRenderer } from '@/components/clients/custom-field-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ClientFieldDefinition } from '@/types/entities';


import { type CustomFieldsCardProps } from './types';

// Helper to check for empty values (handles 0, false, empty string correctly)
const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

// Extracted component for individual custom field rendering
function CustomFieldCardItem({
  definition,
  value,
  isSubmitted,
  onFieldChange,
}: {
  definition: ClientFieldDefinition;
  value: string;
  isSubmitted: boolean;
  onFieldChange: (fieldId: string, value: string) => void;
}) {
  const handleChange = useCallback(
    (newValue: string) => onFieldChange(definition.id, newValue),
    [definition.id, onFieldChange]
  );

  const hasError = definition.isRequired && isEmpty(value) && isSubmitted;

  return (
    <div className="space-y-2">
      <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {definition.label}
        {definition.isRequired && ' *'}
      </label>
      <CustomFieldRenderer definition={definition} value={value} onChange={handleChange} />
      {hasError && <p className="text-destructive text-sm font-medium">To pole jest wymagane</p>}
    </div>
  );
}

/**
 * Custom Fields Card - Renders dynamic custom field definitions
 */
export function CustomFieldsCard({
  definitions,
  values,
  isSubmitted,
  onFieldChange,
}: CustomFieldsCardProps) {
  if (definitions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pola niestandardowe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {definitions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((definition) => (
              <CustomFieldCardItem
                key={definition.id}
                definition={definition}
                value={values[definition.id] || ''}
                isSubmitted={isSubmitted}
                onFieldChange={onFieldChange}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
