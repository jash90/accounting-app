import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnConfig } from '@/lib/hooks/use-table-preferences';

interface ColumnVisibilityDropdownProps {
  columns: ColumnConfig[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onResetToDefaults?: () => void;
}

export function ColumnVisibilityDropdown({
  columns,
  visibleColumns,
  onToggleColumn,
  onResetToDefaults,
}: ColumnVisibilityDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-apptax-soft-teal hover:bg-apptax-soft-teal/30 hover:border-apptax-teal"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Kolumny
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Widoczność kolumn</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibleColumns.includes(column.id)}
            onCheckedChange={() => onToggleColumn(column.id)}
            disabled={column.alwaysVisible}
            className={column.alwaysVisible ? 'opacity-60' : ''}
          >
            {column.label}
            {column.alwaysVisible && (
              <span className="ml-auto text-xs text-muted-foreground">(zawsze)</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        {onResetToDefaults && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={onResetToDefaults}
              className="text-apptax-blue"
            >
              Przywróć domyślne
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
