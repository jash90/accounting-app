import { useMemo } from 'react';

import { X } from 'lucide-react';

import { MobileFilterDrawer } from '@/components/common/mobile-filter-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface FilterFieldsProps {
  isMobile?: boolean;
  filters: TimeEntryFiltersDto;
  clients: Client[];
  onFilterChange: <K extends keyof TimeEntryFiltersDto>(
    key: K,
    value: TimeEntryFiltersDto[K] | null
  ) => void;
}

function FilterFields({ isMobile = false, filters, clients, onFilterChange }: FilterFieldsProps) {
  return (
    <>
      {/* Status */}
      <div className={isMobile ? 'space-y-2' : ''}>
        {isMobile && <Label>Status</Label>}
        <Select
          value={filters.status || '__all__'}
          onValueChange={(value) =>
            onFilterChange('status', value === '__all__' ? undefined : (value as TimeEntryStatus))
          }
        >
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
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
      </div>

      {/* Client */}
      <div className={isMobile ? 'space-y-2' : ''}>
        {isMobile && <Label>Klient</Label>}
        <Select
          value={filters.clientId || '__all__'}
          onValueChange={(value) =>
            onFilterChange('clientId', value === '__all__' ? undefined : value)
          }
        >
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[180px]'}>
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
      </div>

      {/* Billable */}
      <div className={isMobile ? 'space-y-2' : ''}>
        {isMobile && <Label>Rozliczalność</Label>}
        <Select
          value={
            filters.isBillable === undefined ? '__all__' : filters.isBillable ? 'true' : 'false'
          }
          onValueChange={(value) =>
            onFilterChange('isBillable', value === '__all__' ? undefined : value === 'true')
          }
        >
          <SelectTrigger className={isMobile ? 'w-full' : 'w-[150px]'}>
            <SelectValue placeholder="Rozliczalność" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Wszystkie</SelectItem>
            <SelectItem value="true">Rozliczalne</SelectItem>
            <SelectItem value="false">Nierozliczalne</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <div className={isMobile ? 'space-y-2' : 'flex items-center gap-2'}>
        {isMobile && <Label>Zakres dat</Label>}
        <div className={isMobile ? 'flex gap-2' : 'flex items-center gap-2'}>
          <Input
            type="date"
            placeholder="Od"
            value={
              filters.startDate instanceof Date
                ? filters.startDate.toISOString().split('T')[0]
                : filters.startDate || ''
            }
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            className={isMobile ? 'flex-1' : 'w-[150px]'}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            placeholder="Do"
            value={
              filters.endDate instanceof Date
                ? filters.endDate.toISOString().split('T')[0]
                : filters.endDate || ''
            }
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            className={isMobile ? 'flex-1' : 'w-[150px]'}
          />
        </div>
      </div>
    </>
  );
}

export function TimeEntryFilters({
  filters,
  clients,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: TimeEntryFiltersProps) {
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.clientId) count++;
    if (filters.isBillable !== undefined) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  return (
    <div className="border-b px-4 pb-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Mobile: Filter drawer */}
        <MobileFilterDrawer
          title="Filtry czasu pracy"
          description="Filtruj wpisy czasu pracy"
          activeFiltersCount={activeFiltersCount}
          onClear={onClearFilters}
        >
          <FilterFields
            isMobile
            filters={filters}
            clients={clients}
            onFilterChange={onFilterChange}
          />
        </MobileFilterDrawer>

        {/* Desktop: Inline filters */}
        <div className="hidden flex-wrap items-center gap-3 sm:flex">
          <FilterFields filters={filters} clients={clients} onFilterChange={onFilterChange} />

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
    </div>
  );
}
