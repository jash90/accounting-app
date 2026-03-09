import * as React from 'react';
import { useId } from 'react';

import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';

export interface ComboboxOption {
  value: string;
  label: string;
  /**
   * Optional display label shown in the dropdown list.
   * If not provided, falls back to label parsing logic.
   * Use this to avoid fragile string splitting on ' - '.
   */
  displayLabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Wybierz...',
  searchPlaceholder = 'Szukaj...',
  emptyText = 'Nie znaleziono',
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const instanceId = useId();

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(searchLower));
  }, [options, search]);

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions.length]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? null : optionValue);
    setOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${instanceId}-listbox`}
            disabled={disabled}
            className={cn(
              'w-full justify-between pr-14 font-normal',
              !selectedOption && 'text-muted-foreground',
              className
            )}
          >
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
            <ChevronsUpDown className="absolute right-3 h-4 w-4 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        {/* Clear button outside the trigger to avoid nested interactive elements */}
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
            disabled={disabled}
            className="hover:bg-accent focus:ring-ring absolute top-1/2 right-8 -translate-y-1/2 rounded-sm focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:opacity-50"
          >
            <X className="h-4 w-4 opacity-50 hover:opacity-100" aria-hidden="true" />
          </button>
        )}
      </div>
      <PopoverContent
        className="min-w-0 p-0"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <div className="border-b p-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9"
            aria-activedescendant={
              highlightedIndex >= 0 ? `${instanceId}-option-${highlightedIndex}` : undefined
            }
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">{emptyText}</div>
          ) : (
            <div
              className="p-1"
              role="listbox"
              id={`${instanceId}-listbox`}
              aria-label={placeholder}
            >
              {filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  id={`${instanceId}-option-${index}`}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'relative flex w-full cursor-pointer items-start rounded-sm px-3 py-2 text-sm transition-colors outline-none select-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    value === option.value && 'bg-accent/50',
                    highlightedIndex === index && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 mr-2 h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex-1 text-left break-words whitespace-normal">
                    {option.displayLabel ??
                      (option.label.includes(' - ')
                        ? option.label.split(' - ').slice(1).join(' - ')
                        : option.label)}
                  </span>
                  <span className="text-muted-foreground ml-2 shrink-0 font-mono text-xs">
                    {option.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
