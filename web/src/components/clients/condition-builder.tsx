import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  AutoAssignCondition,
  SingleCondition,
  ConditionGroup,
  ConditionOperator,
  LogicalOperator,
  isConditionGroup,
} from '@/types/enums';
import {
  CONDITION_FIELDS,
  OPERATORS_BY_TYPE,
  ConditionOperatorLabels,
  LogicalOperatorLabels,
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  AmlGroupLabels,
  GTU_CODES,
} from '@/lib/constants/polish-labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Trash2, FolderPlus, ChevronDown, Check } from 'lucide-react';

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

export function ConditionBuilder({
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
          >
            <Plus className="w-4 h-4 mr-1" />
            Warunek
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddGroup}
          >
            <FolderPlus className="w-4 h-4 mr-1" />
            Grupa
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Wyczyść
            </Button>
          )}
        </div>
      </div>

      {value ? (
        <ConditionRenderer
          condition={value}
          onChange={onChange}
          onRemove={handleClear}
          isRoot
        />
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <p>Brak warunków. Ikona będzie przypisywana tylko ręcznie.</p>
          <p className="text-sm mt-1">
            Kliknij "Warunek" lub "Grupa", aby dodać automatyczne przypisywanie.
          </p>
        </div>
      )}
    </div>
  );
}

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

  return (
    <SingleConditionRenderer
      condition={condition}
      onChange={onChange}
      onRemove={onRemove}
    />
  );
}

interface GroupConditionRendererProps {
  group: ConditionGroup;
  onChange: (value: AutoAssignCondition) => void;
  onRemove: () => void;
  isRoot?: boolean;
}

function GroupConditionRenderer({
  group,
  onChange,
  onRemove,
  isRoot = false,
}: GroupConditionRendererProps) {
  const handleLogicalOperatorChange = useCallback(
    (operator: LogicalOperator) => {
      onChange({
        ...group,
        logicalOperator: operator,
      });
    },
    [group, onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, newCondition: AutoAssignCondition) => {
      const newConditions = [...group.conditions];
      newConditions[index] = newCondition;
      onChange({
        ...group,
        conditions: newConditions,
      });
    },
    [group, onChange]
  );

  const handleConditionRemove = useCallback(
    (index: number) => {
      const newConditions = group.conditions.filter((_, i) => i !== index);
      if (newConditions.length === 0) {
        onRemove();
      } else if (newConditions.length === 1 && isRoot) {
        // If only one condition left and this is root, unwrap
        onChange(newConditions[0]);
      } else {
        onChange({
          ...group,
          conditions: newConditions,
        });
      }
    },
    [group, onChange, onRemove, isRoot]
  );

  const handleAddCondition = useCallback(() => {
    const newCondition: SingleCondition = {
      id: generateConditionId(),
      field: CONDITION_FIELDS[0].field,
      operator: 'equals',
      value: '',
    };
    onChange({
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  }, [group, onChange]);

  const handleAddNestedGroup = useCallback(() => {
    const newGroup: ConditionGroup = {
      id: generateConditionId(),
      logicalOperator: group.logicalOperator === 'and' ? 'or' : 'and',
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
      ...group,
      conditions: [...group.conditions, newGroup],
    });
  }, [group, onChange]);

  return (
    <Card className={cn(isRoot ? 'border-primary' : 'border-muted')}>
      <CardContent className="pt-4 space-y-3">
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2 pl-4 border-l-2 border-muted">
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddCondition}
          >
            <Plus className="w-4 h-4 mr-1" />
            Warunek
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddNestedGroup}
          >
            <FolderPlus className="w-4 h-4 mr-1" />
            Grupa zagnieżdżona
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SingleConditionRendererProps {
  condition: SingleCondition;
  onChange: (value: AutoAssignCondition) => void;
  onRemove: () => void;
}

function SingleConditionRenderer({
  condition,
  onChange,
  onRemove,
}: SingleConditionRendererProps) {
  const fieldConfig = CONDITION_FIELDS.find((f) => f.field === condition.field);
  const fieldType = fieldConfig?.type || 'string';
  const availableOperators = OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.string;

  const handleFieldChange = useCallback(
    (field: string) => {
      const newFieldConfig = CONDITION_FIELDS.find((f) => f.field === field);
      const newType = newFieldConfig?.type || 'string';
      const newOperators = OPERATORS_BY_TYPE[newType] || OPERATORS_BY_TYPE.string;

      // Reset operator and value if field type changes
      const newOperator = newOperators.includes(condition.operator)
        ? condition.operator
        : newOperators[0];

      onChange({
        id: condition.id, // Preserve condition ID for stable React keys
        field,
        operator: newOperator,
        value: newType === 'boolean' ? false : '',
      });
    },
    [condition.id, condition.operator, onChange]
  );

  const handleOperatorChange = useCallback(
    (operator: ConditionOperator) => {
      onChange({
        ...condition,
        operator,
        // Clear secondary value if not between
        secondValue: operator === 'between' ? condition.secondValue : undefined,
      });
    },
    [condition, onChange]
  );

  const handleValueChange = useCallback(
    (value: string | number | boolean | string[]) => {
      onChange({
        ...condition,
        value,
      });
    },
    [condition, onChange]
  );

  const handleSecondValueChange = useCallback(
    (secondValue: string | number) => {
      onChange({
        ...condition,
        secondValue,
      });
    },
    [condition, onChange]
  );

  const needsValue = !['isEmpty', 'isNotEmpty'].includes(condition.operator);
  const needsSecondValue = condition.operator === 'between';

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
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
          <span className="text-sm text-muted-foreground">i</span>
          <Input
            type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
            value={condition.secondValue?.toString() || ''}
            onChange={(e) => handleSecondValueChange(fieldType === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-32"
          />
        </>
      )}

      {/* Remove Button */}
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface ValueInputProps {
  fieldType: string;
  fieldConfig?: typeof CONDITION_FIELDS[number];
  operator: ConditionOperator;
  value?: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[]) => void;
}

function ValueInput({
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
          <Button
            variant="outline"
            role="combobox"
            className="w-48 justify-between font-normal"
          >
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
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent focus:bg-accent focus:outline-none"
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
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
        <span className="text-sm">{value ? 'Tak' : 'Nie'}</span>
      </div>
    );
  }

  // Enum select
  if (fieldType === 'enum' && fieldConfig) {
    return (
      <Select
        value={value?.toString() || ''}
        onValueChange={onChange}
      >
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
      <Select
        value={value?.toString() || ''}
        onValueChange={onChange}
      >
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
}

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
