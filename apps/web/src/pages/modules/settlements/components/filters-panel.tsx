import { memo, useCallback, useMemo } from 'react';

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

// Hoisted status values array to avoid recreation on each render
const SETTLEMENT_STATUS_VALUES = Object.values(SettlementStatus);

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
  onChange: (filters: SettlementFilters | ((prev: SettlementFilters) => SettlementFilters)) => void;
  showEmployeeFilter?: boolean;
}

// Action types for reducer
type FilterAction =
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_STATUS'; value: SettlementStatus | undefined }
  | { type: 'SET_ASSIGNEE'; value: string | undefined }
  | { type: 'SET_UNASSIGNED'; value: boolean }
  | { type: 'SET_REQUIRES_ATTENTION'; value: boolean }
  | { type: 'CLEAR_ALL' };

// Reducer function - pure, no dependencies, defined outside component
function filtersReducer(state: SettlementFilters, action: FilterAction): SettlementFilters {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.value || undefined };
    case 'SET_STATUS':
      return { ...state, status: action.value };
    case 'SET_ASSIGNEE':
      return {
        ...state,
        assigneeId: action.value,
        unassigned: undefined, // Clear unassigned when setting assignee
      };
    case 'SET_UNASSIGNED':
      return {
        ...state,
        unassigned: action.value || undefined,
        assigneeId: action.value ? undefined : state.assigneeId, // Clear assignee when setting unassigned
      };
    case 'SET_REQUIRES_ATTENTION':
      return { ...state, requiresAttention: action.value || undefined };
    case 'CLEAR_ALL':
      return {};
    default:
      return state;
  }
}

/**
 * Memoized FiltersPanel component.
 * Uses useReducer pattern to avoid recreating handlers when filters change.
 */
export const FiltersPanel = memo(function FiltersPanel({
  filters,
  onChange,
  showEmployeeFilter = false,
}: FiltersPanelProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse ?? [];

  // Note: We use the reducer function directly in callbacks below
  // instead of useReducer to avoid needing to sync internal state with props.
  // The reducer function is still beneficial as it encapsulates state transition logic
  // and is defined outside the component, preventing recreation on each render.

  // Create stable handlers that dispatch actions and call onChange
  // Reducer function is pure - filters are read via closure at call time,
  // so only onChange needs to be in dependency array for stable callbacks
  const handleSearchChange = useCallback(
    (value: string) => {
      onChange((prev) => filtersReducer(prev, { type: 'SET_SEARCH', value }));
    },
    [onChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      const newStatus = value === 'all' ? undefined : (value as SettlementStatus);
      onChange((prev) => filtersReducer(prev, { type: 'SET_STATUS', value: newStatus }));
    },
    [onChange]
  );

  const handleAssigneeChange = useCallback(
    (value: string) => {
      const newValue = value === 'all' ? undefined : value;
      onChange((prev) => filtersReducer(prev, { type: 'SET_ASSIGNEE', value: newValue }));
    },
    [onChange]
  );

  const handleUnassignedChange = useCallback(
    (checked: boolean) => {
      onChange((prev) => filtersReducer(prev, { type: 'SET_UNASSIGNED', value: checked }));
    },
    [onChange]
  );

  // Combined handler for the assignee select - handles both 'unassigned' option and regular assignee selection
  const handleAssigneeSelectChange = useCallback(
    (value: string) => {
      if (value === 'unassigned') {
        handleUnassignedChange(true);
      } else {
        handleAssigneeChange(value);
      }
    },
    [handleUnassignedChange, handleAssigneeChange]
  );

  const handleRequiresAttentionChange = useCallback(
    (checked: boolean) => {
      onChange((prev) =>
        filtersReducer(prev, {
          type: 'SET_REQUIRES_ATTENTION',
          value: checked,
        })
      );
    },
    [onChange]
  );

  const handleClearFilters = useCallback(() => {
    onChange({});
  }, [onChange]);

  // Memoize hasActiveFilters to prevent unnecessary re-renders
  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.status ||
        filters.assigneeId ||
        filters.unassigned ||
        filters.search ||
        filters.requiresAttention
      ),
    [
      filters.status,
      filters.assigneeId,
      filters.unassigned,
      filters.search,
      filters.requiresAttention,
    ]
  );

  // Memoize the assignee select value to avoid recalculation
  const assigneeSelectValue = useMemo(() => {
    if (filters.unassigned) return 'unassigned';
    return filters.assigneeId || 'all';
  }, [filters.unassigned, filters.assigneeId]);

  return (
    <Card className="border-border">
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
                {SETTLEMENT_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {SettlementStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter (only for owner/admin) */}
          {showEmployeeFilter ? (
            <div className="min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Przypisany do</Label>
              <Select value={assigneeSelectValue} onValueChange={handleAssigneeSelectChange}>
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
          ) : null}

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
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-2 h-4 w-4" />
              Wyczyść filtry
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});
