import { memo, useEffect, useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClients } from '@/lib/hooks/use-clients';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useEmployees } from '@/lib/hooks/use-employees';
import { cn } from '@/lib/utils/cn';
import { ALL_FILTER_VALUE, fromFilterValue, toFilterValue } from '@/lib/utils/filter-types';
import { type TaskFiltersDto } from '@/types/dtos';
import { TaskPriorityLabels, TaskStatusLabels } from '@/types/enums';

interface TaskFiltersProps {
  filters: TaskFiltersDto;
  onFiltersChange: (filters: TaskFiltersDto) => void;
  className?: string;
}

interface FilterFormData {
  search: string;
  status: string;
  priority: string;
  assigneeId: string;
  clientId: string;
  dueDateFrom: Date | undefined;
  dueDateTo: Date | undefined;
}

export const TaskFilters = memo(function TaskFilters({
  filters,
  onFiltersChange,
  className,
}: TaskFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debouncedSearch = useDebounce(localSearch, 300);
  const { data: clientsData } = useClients();
  const { data: employeesData } = useEmployees();

  const form = useForm<FilterFormData>({
    defaultValues: {
      search: filters.search || '',
      status: fromFilterValue(filters.status),
      priority: fromFilterValue(filters.priority),
      assigneeId: fromFilterValue(filters.assigneeId),
      clientId: fromFilterValue(filters.clientId),
      dueDateFrom: filters.dueDateFrom ? new Date(filters.dueDateFrom) : undefined,
      dueDateTo: filters.dueDateTo ? new Date(filters.dueDateTo) : undefined,
    },
  });

  const clients = useMemo(() => clientsData?.data || [], [clientsData]);
  const employees = useMemo(() => employeesData || [], [employeesData]);

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.search ||
      !!filters.status ||
      !!filters.priority ||
      !!filters.assigneeId ||
      !!filters.clientId ||
      !!filters.dueDateFrom ||
      !!filters.dueDateTo
    );
  }, [filters]);

  // Sync debounced search value to filters
  useEffect(() => {
    const searchValue = debouncedSearch || undefined;
    if (searchValue !== filters.search) {
      onFiltersChange({ ...filters, search: searchValue });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectChange = (field: keyof TaskFiltersDto, value: string) => {
    const newValue = toFilterValue(value);
    onFiltersChange({ ...filters, [field]: newValue });
  };

  const handleDateChange = (field: 'dueDateFrom' | 'dueDateTo', date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      [field]: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const clearFilters = () => {
    setLocalSearch('');
    form.reset({
      search: '',
      status: ALL_FILTER_VALUE,
      priority: ALL_FILTER_VALUE,
      assigneeId: ALL_FILTER_VALUE,
      clientId: ALL_FILTER_VALUE,
      dueDateFrom: undefined,
      dueDateTo: undefined,
    });
    onFiltersChange({});
  };

  return (
    <Form {...form}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {/* Search */}
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <FormField
            control={form.control}
            name="search"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="Szukaj zadań..."
                    className="pl-9"
                    value={localSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value);
                      setLocalSearch(value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleSelectChange('status', value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Wszystkie</SelectItem>
                  {Object.entries(TaskStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Priority */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleSelectChange('priority', value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priorytet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Wszystkie</SelectItem>
                  {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Assignee */}
        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleSelectChange('assigneeId', value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Przypisany" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Wszyscy</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Client */}
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleSelectChange('clientId', value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Klient" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Wszyscy</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Due Date Range */}
        <FormField
          control={form.control}
          name="dueDateFrom"
          render={({ field }) => (
            <FormItem>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'd MMM', { locale: pl }) : 'Od'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      handleDateChange('dueDateFrom', date);
                    }}
                    locale={pl}
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />

        <span className="text-muted-foreground">-</span>

        <FormField
          control={form.control}
          name="dueDateTo"
          render={({ field }) => (
            <FormItem>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'd MMM', { locale: pl }) : 'Do'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      handleDateChange('dueDateTo', date);
                    }}
                    locale={pl}
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Wyczyść
          </Button>
        )}
      </div>
    </Form>
  );
});
