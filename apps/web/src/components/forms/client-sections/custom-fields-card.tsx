import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type CustomFieldsCardProps } from './types';

/**
 * Custom Fields Card - Renders dynamic custom field definitions
 */
export function CustomFieldsCard({
  definitions,
  values,
  isSubmitted,
  renderField,
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
            .map((definition) => {
              // Helper to check for empty values (handles 0, false, empty string correctly)
              const isEmpty = (v: unknown) => v === undefined || v === null || v === '';
              return (
                <div key={definition.id} className="space-y-2">
                  <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {definition.label}
                    {definition.isRequired && ' *'}
                  </label>
                  {renderField(definition)}
                  {definition.isRequired && isEmpty(values[definition.id]) && isSubmitted && (
                    <p className="text-destructive text-sm font-medium">To pole jest wymagane</p>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
