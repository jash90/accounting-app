import { Zap } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  type AutoAssignCondition,
  type SingleCondition,
  VatStatus,
  EmploymentType,
  TaxScheme,
  ZusStatus,
} from '@/types/enums';

// Field definitions with Polish labels and enum values
const ASSIGNABLE_FIELDS: Record<
  string,
  {
    label: string;
    values: Record<string, string>;
  }
> = {
  vatStatus: {
    label: 'VAT',
    values: {
      [VatStatus.VAT_MONTHLY]: 'VAT miesięcznie',
      [VatStatus.VAT_QUARTERLY]: 'VAT kwartalnie',
      [VatStatus.NO]: 'Nie',
      [VatStatus.NO_WATCH_LIMIT]: 'Nie (limit)',
    },
  },
  employmentType: {
    label: 'Zatrudnienie',
    values: {
      [EmploymentType.DG]: 'DG',
      [EmploymentType.DG_ETAT]: 'DG + Etat',
      [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
      [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 poniżej',
      [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 powyżej',
    },
  },
  taxScheme: {
    label: 'Opodatkowanie',
    values: {
      [TaxScheme.PIT_17]: 'PIT 17%',
      [TaxScheme.PIT_19]: 'PIT 19%',
      [TaxScheme.LUMP_SUM]: 'Ryczałt',
      [TaxScheme.GENERAL]: 'Ogólne',
    },
  },
  zusStatus: {
    label: 'ZUS',
    values: {
      [ZusStatus.FULL]: 'Pełny',
      [ZusStatus.PREFERENTIAL]: 'Preferencyjny',
      [ZusStatus.NONE]: 'Brak',
    },
  },
};

interface AutoAssignConditionBuilderProps {
  value: AutoAssignCondition | undefined | null;
  onChange: (condition: AutoAssignCondition | undefined) => void;
}

function isSingleCondition(condition: AutoAssignCondition): condition is SingleCondition {
  return 'field' in condition && 'operator' in condition;
}

export function AutoAssignConditionBuilder({ value, onChange }: AutoAssignConditionBuilderProps) {
  // Extract current values from condition (only support simple field=value for now)
  const isEnabled = !!value;
  const currentField = value && isSingleCondition(value) ? value.field : '';
  const currentValue = value && isSingleCondition(value) ? (value.value as string) : '';

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      // Set default condition when enabling
      const firstField = Object.keys(ASSIGNABLE_FIELDS)[0];
      const firstValue = Object.keys(ASSIGNABLE_FIELDS[firstField].values)[0];
      onChange({
        field: firstField,
        operator: 'equals',
        value: firstValue,
      });
    } else {
      onChange(undefined);
    }
  };

  const handleFieldChange = (field: string) => {
    // When field changes, reset value to first option
    const firstValue = Object.keys(ASSIGNABLE_FIELDS[field].values)[0];
    onChange({
      field,
      operator: 'equals',
      value: firstValue,
    });
  };

  const handleValueChange = (newValue: string) => {
    // Guard against undefined/empty currentField
    if (!currentField) {
      return;
    }
    onChange({
      field: currentField,
      operator: 'equals',
      value: newValue,
    });
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <Label htmlFor="auto-assign-toggle" className="text-sm font-medium">
              Automatyczne przypisywanie
            </Label>
          </div>
          <Switch id="auto-assign-toggle" checked={isEnabled} onCheckedChange={handleToggle} />
        </div>

        {isEnabled && (
          <div className="space-y-3 pl-6 border-l-2 border-amber-200">
            <p className="text-xs text-muted-foreground mb-2">
              Ikona zostanie automatycznie przypisana do klientów spełniających warunek:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gdy pole</Label>
                <Select value={currentField} onValueChange={handleFieldChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Wybierz pole" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSIGNABLE_FIELDS).map(([fieldKey, fieldDef]) => (
                      <SelectItem key={fieldKey} value={fieldKey}>
                        {fieldDef.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">ma wartość</Label>
                <Select
                  value={currentValue}
                  onValueChange={handleValueChange}
                  disabled={!currentField}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Wybierz wartość" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentField &&
                      Object.entries(ASSIGNABLE_FIELDS[currentField].values).map(
                        ([valueKey, valueLabel]) => (
                          <SelectItem key={valueKey} value={valueKey}>
                            {valueLabel}
                          </SelectItem>
                        )
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
