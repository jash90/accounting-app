import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, X, Filter, ChevronDown, CalendarIcon } from 'lucide-react';
import {
  clientFiltersSchema,
  ClientFiltersFormData,
} from '@/lib/validation/schemas';
import {
  EmploymentType,
  EmploymentTypeLabels,
  VatStatus,
  VatStatusLabels,
  TaxScheme,
  TaxSchemeLabels,
  ZusStatus,
  ZusStatusLabels,
  AmlGroup,
} from '@/types/enums';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { Combobox } from '@/components/ui/combobox';
import { ClientFiltersDto, CustomFieldFilter } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';
import { ClientCustomFilters } from './client-custom-filters';

interface ClientFiltersProps {
  filters: ClientFiltersDto;
  onFiltersChange: (filters: ClientFiltersDto) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>(
    filters.customFieldFilters || []
  );

  const form = useForm<ClientFiltersFormData>({
    resolver: zodResolver(clientFiltersSchema),
    defaultValues: {
      search: filters.search || '',
      employmentType: filters.employmentType,
      vatStatus: filters.vatStatus,
      taxScheme: filters.taxScheme,
      zusStatus: filters.zusStatus,
      amlGroupEnum: filters.amlGroupEnum,
      gtuCode: filters.gtuCode,
      receiveEmailCopy: filters.receiveEmailCopy,
      isActive: filters.isActive,
      cooperationStartDateFrom: filters.cooperationStartDateFrom,
      cooperationStartDateTo: filters.cooperationStartDateTo,
      companyStartDateFrom: filters.companyStartDateFrom,
      companyStartDateTo: filters.companyStartDateTo,
    },
  });

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build filters object from form values
  const buildFilters = useCallback((value: Partial<ClientFiltersFormData>, searchValue: string, customFilters: CustomFieldFilter[]): ClientFiltersDto => {
    const cleanedFilters: ClientFiltersDto = {};

    if (searchValue) cleanedFilters.search = searchValue;
    if (value.employmentType) cleanedFilters.employmentType = value.employmentType as EmploymentType;
    if (value.vatStatus) cleanedFilters.vatStatus = value.vatStatus as VatStatus;
    if (value.taxScheme) cleanedFilters.taxScheme = value.taxScheme as TaxScheme;
    if (value.zusStatus) cleanedFilters.zusStatus = value.zusStatus as ZusStatus;
    if (value.amlGroupEnum) cleanedFilters.amlGroupEnum = value.amlGroupEnum as AmlGroup;
    if (value.gtuCode) cleanedFilters.gtuCode = value.gtuCode;
    if (value.receiveEmailCopy !== undefined) cleanedFilters.receiveEmailCopy = value.receiveEmailCopy;
    if (value.isActive !== undefined) cleanedFilters.isActive = value.isActive;
    if (value.cooperationStartDateFrom) cleanedFilters.cooperationStartDateFrom = value.cooperationStartDateFrom;
    if (value.cooperationStartDateTo) cleanedFilters.cooperationStartDateTo = value.cooperationStartDateTo;
    if (value.companyStartDateFrom) cleanedFilters.companyStartDateFrom = value.companyStartDateFrom;
    if (value.companyStartDateTo) cleanedFilters.companyStartDateTo = value.companyStartDateTo;
    if (customFilters.length > 0) cleanedFilters.customFieldFilters = customFilters;

    return cleanedFilters;
  }, []);

  // Watch form changes and update filters with debounced search
  useEffect(() => {
    const subscription = form.watch((value) => {
      const currentSearch = value.search || '';

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Check if only search changed
      const searchChanged = currentSearch !== debouncedSearch;

      if (searchChanged) {
        // Debounce search changes
        searchTimeoutRef.current = setTimeout(() => {
          setDebouncedSearch(currentSearch);
          onFiltersChange(buildFilters(value, currentSearch, customFieldFilters));
        }, SEARCH_DEBOUNCE_MS);
      } else {
        // Immediate update for non-search filters
        onFiltersChange(buildFilters(value, debouncedSearch, customFieldFilters));
      }
    });

    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form, onFiltersChange, debouncedSearch, buildFilters, customFieldFilters]);

  const handleCustomFieldFiltersChange = useCallback(
    (newCustomFilters: CustomFieldFilter[]) => {
      setCustomFieldFilters(newCustomFilters);
      const formValues = form.getValues();
      onFiltersChange(buildFilters(formValues, debouncedSearch, newCustomFilters));
    },
    [form, onFiltersChange, buildFilters, debouncedSearch]
  );

  const handleClearFilters = useCallback(() => {
    // Reset debounced search to sync with form reset
    setDebouncedSearch('');
    // Reset custom field filters
    setCustomFieldFilters([]);
    // Reset form - watch subscription will call onFiltersChange automatically
    form.reset({
      search: '',
      employmentType: undefined,
      vatStatus: undefined,
      taxScheme: undefined,
      zusStatus: undefined,
      amlGroupEnum: undefined,
      gtuCode: undefined,
      receiveEmailCopy: undefined,
      isActive: undefined,
      cooperationStartDateFrom: undefined,
      cooperationStartDateTo: undefined,
      companyStartDateFrom: undefined,
      companyStartDateTo: undefined,
    });
    // Explicitly trigger filter update with cleared custom fields
    onFiltersChange({});
  }, [form, onFiltersChange]);

  const hasActiveFilters =
    filters.search ||
    filters.employmentType ||
    filters.vatStatus ||
    filters.taxScheme ||
    filters.zusStatus ||
    filters.amlGroupEnum ||
    filters.gtuCode ||
    filters.receiveEmailCopy !== undefined ||
    filters.cooperationStartDateFrom ||
    filters.cooperationStartDateTo ||
    filters.companyStartDateFrom ||
    filters.companyStartDateTo ||
    filters.isActive !== undefined ||
    customFieldFilters.length > 0;

  const hasAdvancedFilters =
    filters.amlGroupEnum ||
    filters.gtuCode ||
    filters.receiveEmailCopy !== undefined ||
    filters.cooperationStartDateFrom ||
    filters.cooperationStartDateTo ||
    filters.companyStartDateFrom ||
    filters.companyStartDateTo;

  return (
    <Card className="border-apptax-soft-teal/30">
      <CardContent className="p-4">
        <Form {...form}>
          <form className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-apptax-blue" />
              <span className="font-medium text-apptax-navy">Filtry</span>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="ml-auto text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Wyczyść
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel className="text-xs">Szukaj</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nazwa, NIP, email..."
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Zatrudnienie</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '_all' ? undefined : value)
                      }
                      value={field.value || '_all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wszystkie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_all">Wszystkie</SelectItem>
                        {Object.entries(EmploymentTypeLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">VAT</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '_all' ? undefined : value)
                      }
                      value={field.value || '_all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wszystkie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_all">Wszystkie</SelectItem>
                        {Object.entries(VatStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxScheme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Opodatkowanie</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '_all' ? undefined : value)
                      }
                      value={field.value || '_all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wszystkie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_all">Wszystkie</SelectItem>
                        {Object.entries(TaxSchemeLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zusStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">ZUS</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '_all' ? undefined : value)
                      }
                      value={field.value || '_all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wszystkie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_all">Wszystkie</SelectItem>
                        {Object.entries(ZusStatusLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '_all' ? undefined : value === 'true')
                      }
                      value={field.value === undefined ? '_all' : field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wszystkie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_all">Wszystkie</SelectItem>
                        <SelectItem value="true">Aktywni</SelectItem>
                        <SelectItem value="false">Nieaktywni</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Advanced Filters Section */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    Filtry zaawansowane
                    {hasAdvancedFilters && (
                      <span className="bg-apptax-blue text-white text-xs px-1.5 py-0.5 rounded">
                        Aktywne
                      </span>
                    )}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range: Cooperation Start Date */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs">Data współpracy od</FormLabel>
                    <FormField
                      control={form.control}
                      name="cooperationStartDateFrom"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'dd.MM.yyyy', { locale: pl }) : 'Wybierz datę'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel className="text-xs">Data współpracy do</FormLabel>
                    <FormField
                      control={form.control}
                      name="cooperationStartDateTo"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'dd.MM.yyyy', { locale: pl }) : 'Wybierz datę'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  {/* Date Range: Company Start Date */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs">Data założenia firmy od</FormLabel>
                    <FormField
                      control={form.control}
                      name="companyStartDateFrom"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'dd.MM.yyyy', { locale: pl }) : 'Wybierz datę'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel className="text-xs">Data założenia firmy do</FormLabel>
                    <FormField
                      control={form.control}
                      name="companyStartDateTo"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'dd.MM.yyyy', { locale: pl }) : 'Wybierz datę'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  {/* AML Group */}
                  <FormField
                    control={form.control}
                    name="amlGroupEnum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Grupa AML</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === '_all' ? undefined : value)
                          }
                          value={field.value || '_all'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wszystkie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_all">Wszystkie</SelectItem>
                            {Object.entries(AmlGroupLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* GTU Code */}
                  <FormField
                    control={form.control}
                    name="gtuCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Kod GTU</FormLabel>
                        <FormControl>
                          <Combobox
                            options={GTU_CODES.map((gtu) => ({
                              value: gtu.code,
                              label: gtu.label,
                            }))}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value || undefined)}
                            placeholder="Wszystkie"
                            searchPlaceholder="Szukaj kodu GTU..."
                            emptyText="Nie znaleziono kodu"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Receive Email Copy */}
                  <FormField
                    control={form.control}
                    name="receiveEmailCopy"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Kopia email</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === '_all' ? undefined : value === 'true')
                          }
                          value={field.value === undefined ? '_all' : field.value ? 'true' : 'false'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wszystkie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_all">Wszystkie</SelectItem>
                            <SelectItem value="true">Tak</SelectItem>
                            <SelectItem value="false">Nie</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Custom Field Filters Section */}
            <ClientCustomFilters
              filters={customFieldFilters}
              onFiltersChange={handleCustomFieldFiltersChange}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
