import { useCallback } from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettlementStatus, SettlementStatusLabels } from '@/lib/api/endpoints/settlements';
import { useEmployees } from '@/lib/hooks/use-employees';

export interface SettlementFilters {
  status?: SettlementStatus;
  assigneeId?: string;
  unassigned?: boolean;
  search?: string;
  taxScheme?: string;
  requiresAttention?: boolean;
}

interface FiltersPanelProps {
  filters: SettlementFilters;
  onChange: (filters: SettlementFilters) => void;
  showEmployeeFilter?: boolean;
}

export function FiltersPanel({ filters, onChange, showEmployeeFilter = false }: FiltersPanelProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse ?? [];

  const handleSearchChange = useCallback(
    (value: string) => {
      onChange({ ...filters, search: value || undefined });
    },
    [filters, onChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        status: value === 'all' ? undefined : (value as SettlementStatus),
      });
    },
    [filters, onChange]
  );

  const handleAssigneeChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        assigneeId: value === 'all' ? undefined : value,
        unassigned: undefined,
      });
    },
    [filters, onChange]
  );

  const handleUnassignedChange = useCallback(
    (checked: boolean) => {
      onChange({
        ...filters,
        unassigned: checked || undefined,
        assigneeId: checked ? undefined : filters.assigneeId,
      });
    },
    [filters, onChange]
  );

  const handleRequiresAttentionChange = useCallback(
    (checked: boolean) => {
      onChange({
        ...filters,
        requiresAttention: checked || undefined,
      });
    },
    [filters, onChange]
  );

  const handleClearFilters = useCallback(() => {
    onChange({});
  }, [onChange]);

  const hasActiveFilters =
    filters.status ||
    filters.assigneeId ||
    filters.unassigned ||
    filters.search ||
    filters.requiresAttention;

  return (
    <Card className="border-apptax-soft-teal/30">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs text-muted-foreground">Szukaj</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nazwa klienta, NIP..."
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {Object.values(SettlementStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {SettlementStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter (only for owner/admin) */}
          {showEmployeeFilter && (
            <div className="min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Przypisany do</Label>
              <Select
                value={filters.unassigned ? 'unassigned' : filters.assigneeId || 'all'}
                onValueChange={(value) => {
                  if (value === 'unassigned') {
                    handleUnassignedChange(true);
                  } else {
                    handleAssigneeChange(value);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Wszyscy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy</SelectItem>
                  <SelectItem value="unassigned">Nieprzypisane</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName && employee.lastName
                        ? `${employee.firstName} ${employee.lastName}`
                        : employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Requires Attention Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="requires-attention"
              checked={filters.requiresAttention || false}
              onCheckedChange={handleRequiresAttentionChange}
            />
            <Label htmlFor="requires-attention" className="cursor-pointer text-sm">
              Wymaga uwagi
            </Label>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-2 h-4 w-4" />
              Wyczyść filtry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
