import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}: GroupedComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
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
      .filter(group => grouped.has(group.key))
      .map(group => ({
        ...group,
        options: grouped.get(group.key) || [],
      }));
  }, [filteredOptions, groups]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? null : optionValue);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

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
              ? (formatDisplayValue ? formatDisplayValue(selectedOption) : selectedOption.label)
              : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {selectedOption && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
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
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {groupedOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <div className="p-1">
              {groupedOptions.map((group) => (
                <div key={group.key}>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-start rounded-sm py-2 px-3 text-sm outline-none transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground',
                        value === option.value && 'bg-accent/50'
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0 mt-0.5',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
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
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
