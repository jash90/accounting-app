import { type ReactNode } from 'react';

import { Filter, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface MobileFilterDrawerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  activeFiltersCount?: number;
  onClear?: () => void;
}

export function MobileFilterDrawer({
  children,
  title = 'Filtry',
  description = 'Filtruj wyniki',
  activeFiltersCount = 0,
  onClear,
}: MobileFilterDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px] sm:hidden">
          <Filter className="mr-2 h-4 w-4" />
          Filtry
          {activeFiltersCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </div>
          {activeFiltersCount > 0 && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-1 h-4 w-4" />
              Wyczyść
            </Button>
          )}
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
