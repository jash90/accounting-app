import { useState, useMemo } from 'react';
import { Settings2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ColumnConfig } from '@/lib/hooks/use-table-preferences';
import { cn } from '@/lib/utils/cn';

interface ColumnGroup {
  key: string;
  label: string;
  columns: ColumnConfig[];
}

interface ColumnVisibilityModalProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onResetToDefaults?: () => void;
  groups?: ColumnGroup[];
}

export function ColumnVisibilityModal({
  columns,
  visibleColumns,
  onToggleColumn,
  onResetToDefaults,
  groups,
}: ColumnVisibilityModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;

  // Filter columns by search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const query = searchQuery.toLowerCase();
    return columns.filter((col) => col.label.toLowerCase().includes(query));
  }, [columns, searchQuery]);

  // Group columns if groups provided, otherwise show flat list
  const groupedColumns = useMemo(() => {
    if (!groups) {
      return [{ key: 'all', label: 'Wszystkie kolumny', columns: filteredColumns }];
    }

    return groups.map((group) => ({
      ...group,
      columns: group.columns.filter((col) =>
        !searchQuery.trim() || col.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter((group) => group.columns.length > 0);
  }, [groups, filteredColumns, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-apptax-soft-teal hover:bg-apptax-soft-teal/30 hover:border-apptax-teal"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Kolumny
          <Badge variant="secondary" className="ml-2 text-xs">
            {visibleCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Widoczność kolumn</DialogTitle>
          <DialogDescription>
            Wybierz które kolumny mają być widoczne w tabeli
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj kolumny..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Columns list */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {groupedColumns.map((group) => (
                <div key={group.key} className="space-y-2">
                  {groups && groups.length > 1 && (
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                      {group.label}
                    </h4>
                  )}
                  <div className="space-y-1">
                    {group.columns.map((column) => {
                      const isVisible = visibleColumns.includes(column.id);
                      const isDisabled = column.alwaysVisible;

                      return (
                        <div
                          key={column.id}
                          className={cn(
                            'flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
                            isDisabled && 'opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`col-${column.id}`}
                              checked={isVisible}
                              onCheckedChange={() => onToggleColumn(column.id)}
                              disabled={isDisabled}
                            />
                            <Label
                              htmlFor={`col-${column.id}`}
                              className={cn(
                                'text-sm cursor-pointer',
                                isDisabled && 'cursor-not-allowed'
                              )}
                            >
                              {column.label}
                            </Label>
                          </div>
                          {isDisabled && (
                            <span className="text-xs text-muted-foreground">
                              zawsze widoczna
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredColumns.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  Nie znaleziono kolumn pasujących do wyszukiwania
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {onResetToDefaults && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetToDefaults}
              className="text-apptax-blue"
            >
              Przywróć domyślne
            </Button>
          )}
          <Button size="sm" onClick={() => setOpen(false)}>
            Gotowe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
