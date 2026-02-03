import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
} from '@/types/enums';

import { SelectFormField } from '../select-form-field';
import { type FormSectionProps } from './types';

/**
 * Tax and Employment Card - Employment Type, VAT Status, Tax Scheme, ZUS Status
 */
export function TaxEmploymentCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podatki i zatrudnienie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectFormField
            control={control}
            name="employmentType"
            label="Forma zatrudnienia"
            options={EmploymentTypeLabels}
          />

          <SelectFormField
            control={control}
            name="vatStatus"
            label="Status VAT"
            options={VatStatusLabels}
          />

          <SelectFormField
            control={control}
            name="taxScheme"
            label="Forma opodatkowania"
            options={TaxSchemeLabels}
          />

          <SelectFormField
            control={control}
            name="zusStatus"
            label="Status ZUS"
            options={ZusStatusLabels}
          />
        </div>
      </CardContent>
    </Card>
  );
}
