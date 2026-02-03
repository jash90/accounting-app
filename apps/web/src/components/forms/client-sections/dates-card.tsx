import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { DateFormField } from '../date-form-field';
import { type FormSectionProps } from './types';

/**
 * Dates Card - Company Start Date, Cooperation Start Date, Suspension Date
 */
export function DatesCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DateFormField control={control} name="companyStartDate" label="Data rozpoczęcia firmy" />

        <DateFormField
          control={control}
          name="cooperationStartDate"
          label="Data rozpoczęcia współpracy"
        />

        <DateFormField control={control} name="suspensionDate" label="Data zawieszenia" />
      </CardContent>
    </Card>
  );
}
