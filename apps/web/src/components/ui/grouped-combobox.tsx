import * as React from 'react';

import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';

export interface GroupedComboboxOption {
  value: string;
  label: string;
  group: string;
}

export interface GroupedComboboxGroup {
  key: string;
  label: string;
}

interface GroupedComboboxProps {
  options: GroupedComboboxOption[];
  groups: GroupedComboboxGroup[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Format the display value shown in the trigger button. Defaults to showing full label. */
  formatDisplayValue?: (option: GroupedComboboxOption) => string;
  /** Callback for async search - called when search input changes */
  onSearchChange?: (search: string) => void;
  /** Shows loading indicator when true */
  isLoading?: boolean;
}

export function GroupedCombobox({
  options,
  groups,
  value,
  onChange,
  placeholder = 'Wybierz...',
  searchPlaceholder = 'Szukaj...',
  emptyText = 'Nie znaleziono',
  disabled = false,
  className,
  formatDisplayValue,
  onSearchChange,
  isLoading = false,
}: GroupedComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(searchLower));
  }, [options, search]);

  // Group filtered options by their group key
  const groupedOptions = React.useMemo(() => {
    const grouped = new Map<string, GroupedComboboxOption[]>();

    for (const option of filteredOptions) {
      const existing = grouped.get(option.group) || [];
      existing.push(option);
      grouped.set(option.group, existing);
    }

    // Return groups in the order defined by groups prop, filtering out empty groups
    return groups
      .filter((group) => grouped.has(group.key))
      .map((group) => ({
        ...group,
        options: grouped.get(group.key) || [],
      }));
  }, [filteredOptions, groups]);

  // Flatten options for keyboard navigation and create index mapping
  const { flatOptions, optionIndexMap } = React.useMemo(() => {
    const flat = groupedOptions.flatMap((group) => group.options);
    const indexMap = new Map<string, number>();
    flat.forEach((option, index) => {
      // Warn about duplicate values in development mode
      if (process.env.NODE_ENV === 'development' && indexMap.has(option.value)) {
        console.warn(
          `[GroupedCombobox] Duplicate option value detected: "${option.value}". ` +
            'This may cause unexpected behavior with keyboard navigation and selection. ' +
            'Ensure all option values are unique.'
        );
      }
      indexMap.set(option.value, index);
    });
    return { flatOptions: flat, optionIndexMap: indexMap };
  }, [groupedOptions]);

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [flatOptions.length]);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      onChange(optionValue === value ? null : optionValue);
      setOpen(false);
      setSearch('');
      setHighlightedIndex(-1);
    },
    [onChange, value]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < flatOptions.length) {
            handleSelect(flatOptions[highlightedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [open, flatOptions, highlightedIndex, handleSelect]
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSearch('');
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selectedOption && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selectedOption
              ? formatDisplayValue
                ? formatDisplayValue(selectedOption)
                : selectedOption.label
              : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {selectedOption && (
              <button
                type="button"
                aria-label="Wyczyść wybór"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                    setSearch('');
                  }
                }}
                className="rounded-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              >
                <X className="h-4 w-4 opacity-50 hover:opacity-100" aria-hidden="true" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-0"
        align="start"
        sideOffset={4}
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <div className="p-2 border-b">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearch(newValue);
              onSearchChange?.(newValue);
            }}
            onKeyDown={handleKeyDown}
            className="h-9"
            autoFocus
            aria-activedescendant={
              highlightedIndex >= 0 ? `grouped-combobox-option-${highlightedIndex}` : undefined
            }
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Ładowanie...
            </div>
          ) : groupedOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="p-1" role="listbox" aria-label="Opcje wyboru">
              {groupedOptions.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`group-${group.key}`}>
                  <div
                    id={`group-${group.key}`}
                    className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0"
                  >
                    {group.label}
                  </div>
                  {group.options.map((option) => {
                    const currentIndex = optionIndexMap.get(option.value) ?? -1;
                    return (
                      <button
                        key={option.value}
                        id={`grouped-combobox-option-${currentIndex}`}
                        role="option"
                        aria-selected={value === option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                          'relative flex w-full cursor-pointer select-none items-start rounded-sm py-2 px-3 text-sm outline-none transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:bg-accent focus:text-accent-foreground',
                          value === option.value && 'bg-accent/50',
                          highlightedIndex === currentIndex && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0 mt-0.5',
                            value === option.value ? 'opacity-100' : 'opacity-0'
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1 whitespace-normal text-left">
                          {option.label.includes(' - ')
                            ? option.label.split(' - ').slice(1).join(' - ')
                            : option.label}
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                          {option.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
