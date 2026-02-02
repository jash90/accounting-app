import { memo } from 'react';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toDateString } from '@/lib/utils/date';
import {
  ALL_FILTER_VALUE,
  booleanToSelectValue,
  fromFilterValue,
  selectValueToBoolean,
  toFilterValue,
} from '@/lib/utils/filter-types';
import { type TimeEntryFiltersDto } from '@/types/dtos';
import { TimeEntryStatusLabels, type TimeEntryStatus } from '@/types/enums';

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

export const TimeEntryFilters = memo(function TimeEntryFilters({
  filters,
  clients,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: TimeEntryFiltersProps) {
  return (
    <div className="border-b px-6 pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={fromFilterValue(filters.status)}
          onValueChange={(value) =>
            onFilterChange('status', toFilterValue(value) as TimeEntryStatus | undefined)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Wszystkie</SelectItem>
            {Object.entries(TimeEntryStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={fromFilterValue(filters.clientId)}
          onValueChange={(value) => onFilterChange('clientId', toFilterValue(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Klient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Wszyscy klienci</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={booleanToSelectValue(filters.isBillable)}
          onValueChange={(value) => onFilterChange('isBillable', selectValueToBoolean(value))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Rozliczalność" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>Wszystkie</SelectItem>
            <SelectItem value="true">Rozliczalne</SelectItem>
            <SelectItem value="false">Nierozliczalne</SelectItem>
          </SelectContent>
        </Select>

        <DatePicker
          placeholder="Data od"
          value={toDateString(filters.startDate)}
          onChange={(value) => onFilterChange('startDate', value || undefined)}
          className="w-[150px]"
        />

        <DatePicker
          placeholder="Data do"
          value={toDateString(filters.endDate)}
          onChange={(value) => onFilterChange('endDate', value || undefined)}
          className="w-[150px]"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Wyczyść
          </Button>
        )}
      </div>
    </div>
  );
});
