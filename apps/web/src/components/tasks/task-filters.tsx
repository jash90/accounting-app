import { useEffect, useMemo, useState } from 'react';

import { useForm, type Control } from 'react-hook-form';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Search, X } from 'lucide-react';

import { MobileFilterDrawer } from '@/components/common/mobile-filter-drawer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
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
import { useEmployees } from '@/lib/hooks/use-employees';
import { cn } from '@/lib/utils/cn';
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

interface Client {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface FilterFieldsProps {
  isMobile?: boolean;
  control: Control<FilterFormData>;
  employees: Employee[];
  clients: Client[];
  onSelectChange: (field: keyof TaskFiltersDto, value: string) => void;
  onDateChange: (field: 'dueDateFrom' | 'dueDateTo', date: Date | undefined) => void;
}

function FilterFields({
  isMobile = false,
  control,
  employees,
  clients,
  onSelectChange,
  onDateChange,
}: FilterFieldsProps) {
  return (
    <>
      {/* Status */}
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem className={isMobile ? 'space-y-2' : ''}>
            {isMobile && <FormLabel>Status</FormLabel>}
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onSelectChange('status', value);
              }}
            >
              <FormControl>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-[140px]'}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
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
        control={control}
        name="priority"
        render={({ field }) => (
          <FormItem className={isMobile ? 'space-y-2' : ''}>
            {isMobile && <FormLabel>Priorytet</FormLabel>}
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onSelectChange('priority', value);
              }}
            >
              <FormControl>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-[130px]'}>
                  <SelectValue placeholder="Priorytet" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
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
        control={control}
        name="assigneeId"
        render={({ field }) => (
          <FormItem className={isMobile ? 'space-y-2' : ''}>
            {isMobile && <FormLabel>Przypisany</FormLabel>}
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onSelectChange('assigneeId', value);
              }}
            >
              <FormControl>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
                  <SelectValue placeholder="Przypisany" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
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
        control={control}
        name="clientId"
        render={({ field }) => (
          <FormItem className={isMobile ? 'space-y-2' : ''}>
            {isMobile && <FormLabel>Klient</FormLabel>}
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onSelectChange('clientId', value);
              }}
            >
              <FormControl>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
                  <SelectValue placeholder="Klient" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">Wszyscy</SelectItem>
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
      <div className={isMobile ? 'space-y-2' : 'flex items-center gap-2'}>
        {isMobile && <FormLabel>Termin wykonania</FormLabel>}
        <div className={isMobile ? 'flex gap-2' : 'flex items-center gap-2'}>
          <FormField
            control={control}
            name="dueDateFrom"
            render={({ field }) => (
              <FormItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          isMobile ? 'flex-1' : 'w-[130px]',
                          'justify-start text-left font-normal',
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
                        onDateChange('dueDateFrom', date);
                      }}
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <span className="text-muted-foreground">-</span>

          <FormField
            control={control}
            name="dueDateTo"
            render={({ field }) => (
              <FormItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          isMobile ? 'flex-1' : 'w-[130px]',
                          'justify-start text-left font-normal',
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
                        onDateChange('dueDateTo', date);
                      }}
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
}

export function TaskFilters({ filters, onFiltersChange, className }: TaskFiltersProps) {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { data: clientsData } = useClients();
  const { data: employeesData } = useEmployees();

  const form = useForm<FilterFormData>({
    defaultValues: {
      search: filters.search || '',
      status: filters.status || 'all',
      priority: filters.priority || 'all',
      assigneeId: filters.assigneeId || 'all',
      clientId: filters.clientId || 'all',
      dueDateFrom: filters.dueDateFrom ? new Date(filters.dueDateFrom) : undefined,
      dueDateTo: filters.dueDateTo ? new Date(filters.dueDateTo) : undefined,
    },
  });

  const clients = useMemo(() => clientsData?.data || [], [clientsData]);
  const employees = useMemo(() => employeesData || [], [employeesData]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.assigneeId) count++;
    if (filters.clientId) count++;
    if (filters.dueDateFrom) count++;
    if (filters.dueDateTo) count++;
    return count;
  }, [filters]);

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

  const handleSearchChange = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSelectChange = (field: keyof TaskFiltersDto, value: string) => {
    const newValue = value === 'all' ? undefined : value;
    onFiltersChange({ ...filters, [field]: newValue });
  };

  const handleDateChange = (field: 'dueDateFrom' | 'dueDateTo', date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      [field]: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const clearFilters = () => {
    form.reset({
      search: '',
      status: 'all',
      priority: 'all',
      assigneeId: 'all',
      clientId: 'all',
      dueDateFrom: undefined,
      dueDateTo: undefined,
    });
    onFiltersChange({});
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <Form {...form}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {/* Search - always visible */}
        <div className="relative min-w-[200px] max-w-sm flex-1">
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
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleSearchChange(e.target.value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Mobile: Filter drawer */}
        <MobileFilterDrawer
          title="Filtry zadań"
          description="Filtruj listę zadań"
          activeFiltersCount={activeFiltersCount}
          onClear={clearFilters}
        >
          <FilterFields
            isMobile
            control={form.control}
            employees={employees}
            clients={clients}
            onSelectChange={handleSelectChange}
            onDateChange={handleDateChange}
          />
        </MobileFilterDrawer>

        {/* Desktop: Inline filters */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <FilterFields
            control={form.control}
            employees={employees}
            clients={clients}
            onSelectChange={handleSelectChange}
            onDateChange={handleDateChange}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Wyczyść
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}
