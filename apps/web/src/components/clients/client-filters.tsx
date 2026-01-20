import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
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
import { usePkdSearch } from '@/lib/hooks/use-pkd-search';
import { Combobox } from '@/components/ui/combobox';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { ClientFiltersDto, CustomFieldFilter } from '@/types/dtos';
import { cn } from '@/lib/utils/cn';
import { ClientCustomFilters } from './client-custom-filters';

interface ClientFiltersProps {
  filters: ClientFiltersDto;
  onFiltersChange: (filters: ClientFiltersDto) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>(
    filters.customFieldFilters || []
  );

  // Sync customFieldFilters when filters prop changes
  useEffect(() => {
    setCustomFieldFilters(filters.customFieldFilters || []);
  }, [filters.customFieldFilters]);

  // Use server-side PKD search instead of static 657 codes
  const {
    options: pkdOptions,
    groups: pkdGroups,
    setSearch: setPkdSearch,
    isLoading: isPkdLoading,
  } = usePkdSearch();

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
      pkdCode: filters.pkdCode,
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

  // Ref to track customFieldFilters without triggering effect re-subscription
  const customFieldFiltersRef = useRef(customFieldFilters);
  customFieldFiltersRef.current = customFieldFilters;

  // Memoize GTU options for the filter combobox
  const gtuOptions = useMemo(
    () =>
      GTU_CODES.map((gtu) => ({
        value: gtu.code,
        label: gtu.label,
      })),
    []
  );

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
    if (value.pkdCode) cleanedFilters.pkdCode = value.pkdCode;
    if (value.isActive !== undefined) cleanedFilters.isActive = value.isActive;
    if (value.cooperationStartDateFrom) cleanedFilters.cooperationStartDateFrom = value.cooperationStartDateFrom;
    if (value.cooperationStartDateTo) cleanedFilters.cooperationStartDateTo = value.cooperationStartDateTo;
    if (value.companyStartDateFrom) cleanedFilters.companyStartDateFrom = value.companyStartDateFrom;
    if (value.companyStartDateTo) cleanedFilters.companyStartDateTo = value.companyStartDateTo;
    if (customFilters.length > 0) cleanedFilters.customFieldFilters = customFilters;

    return cleanedFilters;
  }, []);

  // Use ref for debouncedSearch to avoid stale closure in form.watch callback
  const debouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  // Watch form changes and update filters with debounced search
  useEffect(() => {
    const subscription = form.watch((value) => {
      const currentSearch = value.search || '';

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Check if only search changed (using ref to avoid stale closure)
      const searchChanged = currentSearch !== debouncedSearchRef.current;

      if (searchChanged) {
        // Debounce search changes
        searchTimeoutRef.current = setTimeout(() => {
          setDebouncedSearch(currentSearch);
          onFiltersChange(buildFilters(value, currentSearch, customFieldFiltersRef.current));
        }, SEARCH_DEBOUNCE_MS);
      } else {
        // Immediate update for non-search filters
        onFiltersChange(buildFilters(value, debouncedSearchRef.current, customFieldFiltersRef.current));
      }
    });

    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form, onFiltersChange, buildFilters]);

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
      pkdCode: undefined,
      isActive: undefined,
      cooperationStartDateFrom: undefined,
      cooperationStartDateTo: undefined,
      companyStartDateFrom: undefined,
      companyStartDateTo: undefined,
    });
    // Explicitly trigger filter update with cleared custom fields
    onFiltersChange({});
  }, [form, onFiltersChange]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
        filters.employmentType ||
        filters.vatStatus ||
        filters.taxScheme ||
        filters.zusStatus ||
        filters.amlGroupEnum ||
        filters.gtuCode ||
        filters.pkdCode ||
        filters.cooperationStartDateFrom ||
        filters.cooperationStartDateTo ||
        filters.companyStartDateFrom ||
        filters.companyStartDateTo ||
        filters.isActive !== undefined ||
        customFieldFilters.length > 0
      ),
    [filters, customFieldFilters.length]
  );

  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        filters.amlGroupEnum ||
        filters.gtuCode ||
        filters.pkdCode ||
        filters.cooperationStartDateFrom ||
        filters.cooperationStartDateTo ||
        filters.companyStartDateFrom ||
        filters.companyStartDateTo
      ),
    [filters.amlGroupEnum, filters.gtuCode, filters.pkdCode, filters.cooperationStartDateFrom, filters.cooperationStartDateTo, filters.companyStartDateFrom, filters.companyStartDateTo]
  );

  return (
    <Card className="border-apptax-soft-teal/30">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer select-none w-full text-left"
              aria-expanded={filtersOpen}
            >
              <Filter className="h-4 w-4 text-apptax-blue" aria-hidden="true" />
              <span className="font-medium text-apptax-navy">Filtry</span>
              {hasActiveFilters && (
                <span className="bg-apptax-blue text-white text-xs px-1.5 py-0.5 rounded">
                  Aktywne
                </span>
              )}
              <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform', filtersOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="ml-auto text-xs mt-2"
            >
              <X className="h-3 w-3 mr-1" />
              Wyczyść filtry
            </Button>
          )}
          <CollapsibleContent>
            <Form {...form}>
              <form className="space-y-4 mt-4">
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
                  <FormField
                    control={form.control}
                    name="cooperationStartDateFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Data współpracy od</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cooperationStartDateTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Data współpracy do</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Date Range: Company Start Date */}
                  <FormField
                    control={form.control}
                    name="companyStartDateFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Data założenia firmy od</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyStartDateTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Data założenia firmy do</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

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

                  {/* PKD Code */}
                  <FormField
                    control={form.control}
                    name="pkdCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Kod PKD</FormLabel>
                        <FormControl>
                          <GroupedCombobox
                            options={pkdOptions}
                            groups={pkdGroups}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value || undefined)}
                            onSearchChange={setPkdSearch}
                            isLoading={isPkdLoading}
                            placeholder="Wszystkie"
                            searchPlaceholder="Szukaj kodu PKD..."
                            emptyText="Nie znaleziono kodu"
                            formatDisplayValue={(option) => option.value}
                          />
                        </FormControl>
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
                            options={gtuOptions}
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
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
