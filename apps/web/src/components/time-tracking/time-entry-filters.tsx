import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimeEntryFiltersDto } from '@/types/dtos';
import { TimeEntryStatus, TimeEntryStatusLabels } from '@/types/enums';

interface Client {
  id: string;
  name: string;
}

interface TimeEntryFiltersProps {
  filters: TimeEntryFiltersDto;
  clients: Client[];
  hasActiveFilters: boolean;
  onFilterChange: <K extends keyof TimeEntryFiltersDto>(
    key: K,
    value: TimeEntryFiltersDto[K] | null
  ) => void;
  onClearFilters: () => void;
}

export function TimeEntryFilters({
  filters,
  clients,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: TimeEntryFiltersProps) {
  return (
    <div className="px-6 pb-4 border-b">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status || '__all__'}
          onValueChange={(value) =>
            onFilterChange(
              'status',
              value === '__all__' ? undefined : (value as TimeEntryStatus)
            )
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie</SelectItem>
            {Object.entries(TimeEntryStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clientId || '__all__'}
          onValueChange={(value) =>
            onFilterChange('clientId', value === '__all__' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Klient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszyscy klienci</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            filters.isBillable === undefined
              ? '__all__'
              : filters.isBillable
                ? 'true'
                : 'false'
          }
          onValueChange={(value) =>
            onFilterChange(
              'isBillable',
              value === '__all__' ? undefined : value === 'true'
            )
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rozliczalność" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie</SelectItem>
            <SelectItem value="true">Rozliczalne</SelectItem>
            <SelectItem value="false">Nierozliczalne</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="Od"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange('startDate', e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
          placeholder="Do"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange('endDate', e.target.value)}
          className="w-[150px]"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Wyczyść
          </Button>
        )}
      </div>
    </div>
  );
}
