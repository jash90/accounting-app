import { useState, useCallback, useMemo } from 'react';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronDown, CalendarIcon, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { useFieldDefinitions } from '@/lib/hooks/use-clients';
import { cn } from '@/lib/utils/cn';
import { type CustomFieldFilter } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';
import { CustomFieldType } from '@/types/enums';

interface ClientCustomFiltersProps {
  filters: CustomFieldFilter[];
  onFiltersChange: (filters: CustomFieldFilter[]) => void;
}

// Operator labels in Polish
const TEXT_OPERATORS = [
  { value: 'eq', label: 'Równa się' },
  { value: 'contains', label: 'Zawiera' },
];

const NUMBER_OPERATORS = [
  { value: 'eq', label: 'Równa się' },
  { value: 'gt', label: 'Większe niż' },
  { value: 'gte', label: 'Większe lub równe' },
  { value: 'lt', label: 'Mniejsze niż' },
  { value: 'lte', label: 'Mniejsze lub równe' },
];

const DATE_OPERATORS = [
  { value: 'eq', label: 'Równa się' },
  { value: 'gt', label: 'Po' },
  { value: 'gte', label: 'Od' },
  { value: 'lt', label: 'Przed' },
  { value: 'lte', label: 'Do' },
];

const ENUM_OPERATORS = [
  { value: 'eq', label: 'Równa się' },
  { value: 'in', label: 'Jeden z' },
];

function getOperatorsForFieldType(fieldType: CustomFieldType) {
  switch (fieldType) {
    case CustomFieldType.TEXT:
      return TEXT_OPERATORS;
    case CustomFieldType.NUMBER:
      return NUMBER_OPERATORS;
    case CustomFieldType.DATE:
      return DATE_OPERATORS;
    case CustomFieldType.BOOLEAN:
      return [{ value: 'eq', label: 'Równa się' }];
    case CustomFieldType.ENUM:
      return ENUM_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

function getDefaultOperator(fieldType: CustomFieldType): string {
  switch (fieldType) {
    case CustomFieldType.TEXT:
      return 'contains';
    case CustomFieldType.NUMBER:
    case CustomFieldType.DATE:
    case CustomFieldType.BOOLEAN:
    case CustomFieldType.ENUM:
      return 'eq';
    default:
      return 'eq';
  }
}

interface FieldFilterState {
  fieldId: string;
  operator: string;
  value: string | string[];
}

interface CustomFieldFilterControlProps {
  field: ClientFieldDefinition;
  filter?: FieldFilterState;
  onChange: (filter: FieldFilterState | null) => void;
}

function CustomFieldFilterControl({ field, filter, onChange }: CustomFieldFilterControlProps) {
  const operators = getOperatorsForFieldType(field.fieldType);
  const currentOperator = filter?.operator || getDefaultOperator(field.fieldType);
  const currentValue = filter?.value || '';

  const handleOperatorChange = useCallback(
    (newOperator: string) => {
      if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) {
        // No value yet, just update operator in memory (not triggering filter)
        return;
      }
      onChange({
        fieldId: field.id,
        operator: newOperator,
        value: currentValue,
      });
    },
    [field.id, currentValue, onChange]
  );

  const handleValueChange = useCallback(
    (newValue: string | string[]) => {
      if (!newValue || (Array.isArray(newValue) && newValue.length === 0) || newValue === '') {
        onChange(null); // Clear the filter
        return;
      }
      onChange({
        fieldId: field.id,
        operator: currentOperator,
        value: newValue,
      });
    },
    [field.id, currentOperator, onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Render different controls based on field type
  switch (field.fieldType) {
    case CustomFieldType.TEXT:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{field.label}</Label>
          <div className="flex gap-2">
            <Select value={currentOperator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                placeholder={`Wartość...`}
                value={typeof currentValue === 'string' ? currentValue : ''}
                onChange={(e) => handleValueChange(e.target.value)}
              />
              {currentValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      );

    case CustomFieldType.NUMBER:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{field.label}</Label>
          <div className="flex gap-2">
            <Select value={currentOperator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="Wartość..."
                value={typeof currentValue === 'string' ? currentValue : ''}
                onChange={(e) => handleValueChange(e.target.value)}
              />
              {currentValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      );

    case CustomFieldType.DATE:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{field.label}</Label>
          <div className="flex gap-2">
            <Select value={currentOperator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex-1 justify-start text-left font-normal',
                    !currentValue && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentValue &&
                  typeof currentValue === 'string' &&
                  !isNaN(Date.parse(currentValue))
                    ? format(new Date(currentValue), 'dd.MM.yyyy', { locale: pl })
                    : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    currentValue &&
                    typeof currentValue === 'string' &&
                    !isNaN(Date.parse(currentValue))
                      ? new Date(currentValue)
                      : undefined
                  }
                  onSelect={(date) => handleValueChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {currentValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      );

    case CustomFieldType.BOOLEAN:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Select
            value={currentValue === '' ? '_all' : String(currentValue)}
            onValueChange={(value) => {
              if (value === '_all') {
                handleClear();
              } else {
                handleValueChange(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Wszystkie</SelectItem>
              <SelectItem value="true">Tak</SelectItem>
              <SelectItem value="false">Nie</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case CustomFieldType.ENUM: {
      const enumValues = field.enumValues || [];
      const selectedValues = Array.isArray(currentValue)
        ? currentValue
        : currentValue
          ? [currentValue]
          : [];
      const isMultiSelect = currentOperator === 'in';

      if (isMultiSelect) {
        return (
          <div className="space-y-2">
            <Label className="text-xs font-medium">{field.label}</Label>
            <div className="flex items-start gap-2">
              <Select value={currentOperator} onValueChange={handleOperatorChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 space-y-1">
                <div className="flex min-h-[40px] flex-wrap gap-2 rounded-md border p-2">
                  {enumValues.map((enumValue) => {
                    const isSelected = selectedValues.includes(enumValue);
                    return (
                      <label
                        key={enumValue}
                        className={cn(
                          'flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
                          isSelected ? 'bg-apptax-blue text-white' : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newValues = checked
                              ? [...selectedValues, enumValue]
                              : selectedValues.filter((v) => v !== enumValue);
                            handleValueChange(newValues);
                          }}
                          className="sr-only"
                        />
                        {enumValue}
                      </label>
                    );
                  })}
                </div>
                {selectedValues.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleClear}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Wyczyść wybór
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Single select for 'eq' operator
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium">{field.label}</Label>
          <div className="flex gap-2">
            <Select value={currentOperator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeof currentValue === 'string' ? currentValue : selectedValues[0] || '_all'}
              onValueChange={(value) => {
                if (value === '_all') {
                  handleClear();
                } else {
                  handleValueChange(value);
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Wybierz wartość" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Wszystkie</SelectItem>
                {enumValues.map((enumValue) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function ClientCustomFilters({ filters, onFiltersChange }: ClientCustomFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: fieldDefinitionsData, isLoading } = useFieldDefinitions({ limit: 100 });

  const activeFieldDefinitions = useMemo(() => {
    return fieldDefinitionsData?.data?.filter((fd) => fd.isActive) || [];
  }, [fieldDefinitionsData]);

  // Convert filters array to a map for easier lookup
  const filtersMap = useMemo(() => {
    const map = new Map<string, FieldFilterState>();
    filters.forEach((f) => {
      map.set(f.fieldId, f);
    });
    return map;
  }, [filters]);

  const handleFilterChange = useCallback(
    (fieldId: string, newFilter: FieldFilterState | null) => {
      const newFilters = filters.filter((f) => f.fieldId !== fieldId);
      if (newFilter) {
        newFilters.push(newFilter);
      }
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const hasActiveFilters = filters.length > 0;

  const handleClearAll = useCallback(() => {
    onFiltersChange([]);
  }, [onFiltersChange]);

  if (activeFieldDefinitions.length === 0 && !isLoading) {
    return null; // No custom fields defined
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            Pola niestandardowe
            {hasActiveFilters && (
              <span className="bg-apptax-soft-teal text-apptax-navy rounded px-1.5 py-0.5 text-xs">
                {filters.length}
              </span>
            )}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            <span className="text-muted-foreground ml-2 text-sm">Ładowanie pól...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeFieldDefinitions.map((field) => (
                <CustomFieldFilterControl
                  key={field.id}
                  field={field}
                  filter={filtersMap.get(field.id)}
                  onChange={(newFilter) => handleFilterChange(field.id, newFilter)}
                />
              ))}
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end border-t pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Wyczyść wszystkie filtry niestandardowe
                </Button>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
