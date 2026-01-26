import { memo, useCallback, useLayoutEffect, useRef } from 'react';

import { Check, ChevronDown, FolderPlus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AmlGroupLabels,
  CONDITION_FIELDS,
  ConditionOperatorLabels,
  EmploymentTypeLabels,
  GTU_CODES,
  LogicalOperatorLabels,
  OPERATORS_BY_TYPE,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
} from '@/lib/constants/polish-labels';
import { cn } from '@/lib/utils/cn';
import {
  isConditionGroup,
  type AutoAssignCondition,
  type ConditionGroup,
  type ConditionOperator,
  type LogicalOperator,
  type SingleCondition,
} from '@/types/enums';

// Generate unique ID for condition tracking (stable React keys)
// Uses crypto.randomUUID() for SSR-safe, collision-resistant IDs
function generateConditionId(): string {
  // crypto.randomUUID() is available in Node.js 14.17+ and all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments (SSR-safe - doesn't use mutable counter)
  return `cond-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface ConditionBuilderProps {
  value?: AutoAssignCondition;
  onChange: (value: AutoAssignCondition | undefined) => void;
  className?: string;
}

export const ConditionBuilder = memo(function ConditionBuilder({
  value,
  onChange,
  className,
}: ConditionBuilderProps) {
  const handleAddCondition = useCallback(() => {
    const newCondition: SingleCondition = {
      id: generateConditionId(),
      field: CONDITION_FIELDS[0].field,
      operator: 'equals',
      value: '',
    };

    if (!value) {
      onChange(newCondition);
    } else if (isConditionGroup(value)) {
      onChange({
        ...value,
        conditions: [...value.conditions, newCondition],
      });
    } else {
      // Convert single condition to group
      onChange({
        id: generateConditionId(),
        logicalOperator: 'and',
        conditions: [value, newCondition],
      });
    }
  }, [value, onChange]);

  const handleAddGroup = useCallback(() => {
    const newGroup: ConditionGroup = {
      id: generateConditionId(),
      logicalOperator: 'and',
      conditions: [
        {
          id: generateConditionId(),
          field: CONDITION_FIELDS[0].field,
          operator: 'equals',
          value: '',
        },
      ],
    };

    if (!value) {
      onChange(newGroup);
    } else if (isConditionGroup(value)) {
      onChange({
        ...value,
        conditions: [...value.conditions, newGroup],
      });
    } else {
      // Convert single condition to group with nested group
      onChange({
        id: generateConditionId(),
        logicalOperator: 'and',
        conditions: [value, newGroup],
      });
    }
  }, [value, onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Warunki automatycznego przypisania</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAddCondition}>
            <Plus className="mr-1 h-4 w-4" />
            Warunek
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleAddGroup}>
            <FolderPlus className="mr-1 h-4 w-4" />
            Grupa
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="mr-1 h-4 w-4" />
              Wyczyść
            </Button>
          )}
        </div>
      </div>

      {value ? (
        <ConditionRenderer condition={value} onChange={onChange} onRemove={handleClear} isRoot />
      ) : (
        <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
          <p>Brak warunków. Ikona będzie przypisywana tylko ręcznie.</p>
          <p className="mt-1 text-sm">
            Kliknij &quot;Warunek&quot; lub &quot;Grupa&quot;, aby dodać automatyczne przypisywanie.
          </p>
        </div>
      )}
    </div>
  );
});

interface ConditionRendererProps {
  condition: AutoAssignCondition;
  onChange: (value: AutoAssignCondition) => void;
  onRemove: () => void;
  isRoot?: boolean;
}

function ConditionRenderer({
  condition,
  onChange,
  onRemove,
  isRoot = false,
}: ConditionRendererProps) {
  if (isConditionGroup(condition)) {
    return (
      <GroupConditionRenderer
        group={condition}
        onChange={onChange}
        onRemove={onRemove}
        isRoot={isRoot}
      />
    );
  }

  return <SingleConditionRenderer condition={condition} onChange={onChange} onRemove={onRemove} />;
}

interface GroupConditionRendererProps {
  group: ConditionGroup;
  onChange: (value: AutoAssignCondition) => void;
  onRemove: () => void;
  isRoot?: boolean;
}

const GroupConditionRenderer = memo(function GroupConditionRenderer({
  group,
  onChange,
  onRemove,
  isRoot = false,
}: GroupConditionRendererProps) {
  // Store current group in ref for stable callback access
  // This prevents callback recreation when group object changes
  const groupRef = useRef(group);
  useLayoutEffect(() => {
    groupRef.current = group;
  });

  const handleLogicalOperatorChange = useCallback(
    (operator: LogicalOperator) => {
      onChange({
        ...groupRef.current,
        logicalOperator: operator,
      });
    },
    [onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, newCondition: AutoAssignCondition) => {
      const newConditions = [...groupRef.current.conditions];
      newConditions[index] = newCondition;
      onChange({
        ...groupRef.current,
        conditions: newConditions,
      });
    },
    [onChange]
  );

  const handleConditionRemove = useCallback(
    (index: number) => {
      const current = groupRef.current;
      const newConditions = current.conditions.filter((_, i) => i !== index);
      if (newConditions.length === 0) {
        onRemove();
      } else if (newConditions.length === 1 && isRoot) {
        // If only one condition left and this is root, unwrap
        onChange(newConditions[0]);
      } else {
        onChange({
          ...current,
          conditions: newConditions,
        });
      }
    },
    [onChange, onRemove, isRoot]
  );

  const handleAddCondition = useCallback(() => {
    const newCondition: SingleCondition = {
      id: generateConditionId(),
      field: CONDITION_FIELDS[0].field,
      operator: 'equals',
      value: '',
    };
    onChange({
      ...groupRef.current,
      conditions: [...groupRef.current.conditions, newCondition],
    });
  }, [onChange]);

  const handleAddNestedGroup = useCallback(() => {
    const current = groupRef.current;
    const newGroup: ConditionGroup = {
      id: generateConditionId(),
      logicalOperator: current.logicalOperator === 'and' ? 'or' : 'and',
      conditions: [
        {
          id: generateConditionId(),
          field: CONDITION_FIELDS[0].field,
          operator: 'equals',
          value: '',
        },
      ],
    };
    onChange({
      ...current,
      conditions: [...current.conditions, newGroup],
    });
  }, [onChange]);

  return (
    <Card className={cn(isRoot ? 'border-primary' : 'border-muted')}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Spełnij</span>
            <Select
              value={group.logicalOperator}
              onValueChange={(v) => handleLogicalOperatorChange(v as LogicalOperator)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">{LogicalOperatorLabels.and}</SelectItem>
                <SelectItem value="or">{LogicalOperatorLabels.or}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm font-medium">
              {group.logicalOperator === 'and' ? 'wszystkie warunki' : 'dowolny warunek'}
            </span>
          </div>
          {!isRoot && (
            <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="border-muted space-y-2 border-l-2 pl-4">
          {group.conditions.map((cond, index) => (
            <ConditionRenderer
              key={cond.id || `fallback-${index}`}
              condition={cond}
              onChange={(newCond) => handleConditionChange(index, newCond)}
              onRemove={() => handleConditionRemove(index)}
            />
          ))}
        </div>

        <div className="flex gap-2 pl-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleAddCondition}>
            <Plus className="mr-1 h-4 w-4" />
            Warunek
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddNestedGroup}>
            <FolderPlus className="mr-1 h-4 w-4" />
            Grupa zagnieżdżona
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

interface SingleConditionRendererProps {
  condition: SingleCondition;
  onChange: (value: AutoAssignCondition) => void;
  onRemove: () => void;
}

const SingleConditionRenderer = memo(function SingleConditionRenderer({
  condition,
  onChange,
  onRemove,
}: SingleConditionRendererProps) {
  // Store current condition in ref for stable callback access
  // This prevents callback recreation when condition object changes
  const conditionRef = useRef(condition);
  useLayoutEffect(() => {
    conditionRef.current = condition;
  });

  const fieldConfig = CONDITION_FIELDS.find((f) => f.field === condition.field);
  const fieldType = fieldConfig?.type || 'string';
  const availableOperators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;

  const handleFieldChange = useCallback(
    (field: string) => {
      const current = conditionRef.current;
      const newFieldConfig = CONDITION_FIELDS.find((f) => f.field === field);
      const newType = newFieldConfig?.type || 'string';
      const newOperators = OPERATORS_BY_TYPE[newType] || OPERATORS_BY_TYPE.string;

      // Reset operator and value if field type changes
      const newOperator = newOperators.includes(current.operator)
        ? current.operator
        : newOperators[0];

      onChange({
        id: current.id, // Preserve condition ID for stable React keys
        field,
        operator: newOperator,
        value: newType === 'boolean' ? false : '',
      });
    },
    [onChange]
  );

  const handleOperatorChange = useCallback(
    (operator: ConditionOperator) => {
      const current = conditionRef.current;
      onChange({
        ...current,
        operator,
        // Clear secondary value if not between
        secondValue: operator === 'between' ? current.secondValue : undefined,
      });
    },
    [onChange]
  );

  const handleValueChange = useCallback(
    (value: string | number | boolean | string[]) => {
      onChange({
        ...conditionRef.current,
        value,
      });
    },
    [onChange]
  );

  const handleSecondValueChange = useCallback(
    (secondValue: string | number) => {
      onChange({
        ...conditionRef.current,
        secondValue,
      });
    },
    [onChange]
  );

  const needsValue = !['isEmpty', 'isNotEmpty'].includes(condition.operator);
  const needsSecondValue = condition.operator === 'between';

  return (
    <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-2">
      {/* Field Select */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_FIELDS.map((field) => (
            <SelectItem key={field.field} value={field.field}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Select */}
      <Select
        value={condition.operator}
        onValueChange={(v) => handleOperatorChange(v as ConditionOperator)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op} value={op}>
              {ConditionOperatorLabels[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {needsValue && (
        <ValueInput
          fieldType={fieldType}
          fieldConfig={fieldConfig}
          operator={condition.operator}
          value={condition.value}
          onChange={handleValueChange}
        />
      )}

      {/* Second Value for 'between' */}
      {needsSecondValue && (
        <>
          <span className="text-muted-foreground text-sm">i</span>
          <Input
            type={fieldType === 'date' ? 'date' : 'text'}
            value={condition.secondValue?.toString() || ''}
            onChange={(e) => handleSecondValueChange(e.target.value)}
            className="w-32"
          />
        </>
      )}

      {/* Remove Button */}
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

interface ValueInputProps {
  fieldType: string;
  fieldConfig?: (typeof CONDITION_FIELDS)[number];
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[]) => void;
}

const ValueInput = memo(function ValueInput({
  fieldType,
  fieldConfig,
  operator,
  value,
  onChange,
}: ValueInputProps) {
  // Multi-select for 'in' and 'notIn' operators - use proper multi-select with checkboxes
  if (['in', 'notIn'].includes(operator) && fieldConfig?.type === 'enum') {
    const selectedValues = Array.isArray(value) ? value : [];
    const options = getEnumOptions(fieldConfig.field);

    const handleToggle = (optValue: string) => {
      const newValues = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange(newValues);
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-48 justify-between font-normal">
            <span className="truncate">
              {selectedValues.length === 0
                ? 'Wybierz wartości...'
                : selectedValues.length === 1
                  ? options.find((o) => o.value === selectedValues[0])?.label
                  : `Wybrano ${selectedValues.length}`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <div
            className="max-h-60 overflow-auto p-1"
            role="listbox"
            aria-multiselectable="true"
            aria-label="Wybierz wartości"
          >
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm focus:outline-none"
                  onClick={() => handleToggle(opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggle(opt.value);
                    }
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Boolean switch
  if (fieldType === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
        <span className="text-sm">{value ? 'Tak' : 'Nie'}</span>
      </div>
    );
  }

  // Enum select
  if (fieldType === 'enum' && fieldConfig) {
    return (
      <Select value={value?.toString() || ''} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Wybierz..." />
        </SelectTrigger>
        <SelectContent>
          {getEnumOptions(fieldConfig.field).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Array (GTU codes)
  if (fieldType === 'array' && fieldConfig?.field === 'gtuCodes') {
    return (
      <Select value={value?.toString() || ''} onValueChange={onChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Wybierz kod GTU..." />
        </SelectTrigger>
        <SelectContent>
          {GTU_CODES.map((gtu) => (
            <SelectItem key={gtu.code} value={gtu.code}>
              {gtu.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date input
  if (fieldType === 'date') {
    return (
      <Input
        type="date"
        value={value?.toString() || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-40"
      />
    );
  }

  // Number input
  if (fieldType === 'number') {
    return (
      <Input
        type="number"
        value={value?.toString() || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32"
      />
    );
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={value?.toString() || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-48"
      placeholder="Wartość..."
    />
  );
});

// Helper function to get enum options based on field
function getEnumOptions(field: string): { value: string; label: string }[] {
  switch (field) {
    case 'employmentType':
      return Object.entries(EmploymentTypeLabels).map(([value, label]) => ({
        value,
        label,
      }));
    case 'vatStatus':
      return Object.entries(VatStatusLabels).map(([value, label]) => ({
        value,
        label,
      }));
    case 'taxScheme':
      return Object.entries(TaxSchemeLabels).map(([value, label]) => ({
        value,
        label,
      }));
    case 'zusStatus':
      return Object.entries(ZusStatusLabels).map(([value, label]) => ({
        value,
        label,
      }));
    case 'amlGroupEnum':
      return Object.entries(AmlGroupLabels).map(([value, label]) => ({
        value,
        label,
      }));
    default:
      return [];
  }
}
