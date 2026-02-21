'use client';

import { useMemo } from 'react';

import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Chevron component for Calendar navigation.
 */
function ChevronIcon({
  orientation = 'right',
}: {
  className?: string;
  size?: number;
  disabled?: boolean;
  orientation?: 'left' | 'right' | 'up' | 'down';
}) {
  const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
  return <Icon className="h-4 w-4" />;
}

// Static classNames hoisted outside component to prevent re-creation on every render
const defaultClassNames = {
  months: 'flex flex-col sm:flex-row gap-4',
  month: 'flex flex-col gap-4',
  month_caption: 'relative flex items-center justify-center h-7',
  caption_label: 'text-sm font-medium',
  nav: 'absolute inset-x-1 top-0 flex items-center justify-between pointer-events-none',
  button_previous: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-7 w-7 bg-transparent p-0 text-muted-foreground hover:text-foreground hover:bg-accent pointer-events-auto'
  ),
  button_next: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-7 w-7 bg-transparent p-0 text-muted-foreground hover:text-foreground hover:bg-accent pointer-events-auto'
  ),
  month_grid: 'w-full border-collapse',
  weekdays: 'flex w-full',
  weekday: 'text-muted-foreground w-9 font-normal text-[0.8rem] flex items-center justify-center',
  week: 'flex w-full mt-2',
  day: cn(
    'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
    'h-9 w-9 flex items-center justify-center'
  ),
  day_button: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-8 w-8 min-w-0 p-0 font-normal rounded-md',
    'hover:bg-accent hover:text-accent-foreground',
    'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground'
  ),
  range_start: 'day-range-start rounded-l-md',
  range_end: 'day-range-end rounded-r-md',
  selected:
    'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
  today: 'ring-1 ring-primary text-primary font-semibold rounded-md',
  outside:
    'text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
  disabled: 'text-muted-foreground opacity-50',
  range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none',
  hidden: 'invisible',
} as const;

// Static components object hoisted outside to prevent re-creation
const defaultComponents = {
  Chevron: ChevronIcon,
} as const;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  // Memoize merged classNames only when custom classNames are provided
  const mergedClassNames = useMemo(
    () => (classNames ? { ...defaultClassNames, ...classNames } : defaultClassNames),
    [classNames]
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3 min-w-[280px]', className)}
      classNames={mergedClassNames}
      components={defaultComponents}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
