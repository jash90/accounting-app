import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Filter, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { usePkdSearch } from '@/lib/hooks/use-pkd-search';
import { cn } from '@/lib/utils/cn';
import { clientFiltersSchema, type ClientFiltersFormData } from '@/lib/validation/schemas';
import { type ClientFiltersDto, type CustomFieldFilter } from '@/types/dtos';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
  type AmlGroup,
  type EmploymentType,
  type TaxScheme,
  type VatStatus,
  type ZusStatus,
} from '@/types/enums';

import { ClientCustomFilters } from './client-custom-filters';

interface ClientFiltersProps {
  filters: ClientFiltersDto;
  onFiltersChange: (filters: ClientFiltersDto) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Client filters component wrapped in memo() for performance.
 * Only re-renders when filters or onFiltersChange change.
 */
export const ClientFilters = memo(function ClientFilters({
  filters,
  onFiltersChange,
}: ClientFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>(
    filters.customFieldFilters || []
  );
  const [isPending, startTransition] = useTransition();

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
  const buildFilters = useCallback(
    (
      value: Partial<ClientFiltersFormData>,
      searchValue: string,
      customFilters: CustomFieldFilter[]
    ): ClientFiltersDto => {
      const cleanedFilters: ClientFiltersDto = {};

      if (searchValue) cleanedFilters.search = searchValue;
      if (value.employmentType)
        cleanedFilters.employmentType = value.employmentType as EmploymentType;
      if (value.vatStatus) cleanedFilters.vatStatus = value.vatStatus as VatStatus;
      if (value.taxScheme) cleanedFilters.taxScheme = value.taxScheme as TaxScheme;
      if (value.zusStatus) cleanedFilters.zusStatus = value.zusStatus as ZusStatus;
      if (value.amlGroupEnum) cleanedFilters.amlGroupEnum = value.amlGroupEnum as AmlGroup;
      if (value.gtuCode) cleanedFilters.gtuCode = value.gtuCode;
      if (value.pkdCode) cleanedFilters.pkdCode = value.pkdCode;
      if (value.isActive !== undefined) cleanedFilters.isActive = value.isActive;
      if (value.cooperationStartDateFrom)
        cleanedFilters.cooperationStartDateFrom = value.cooperationStartDateFrom;
      if (value.cooperationStartDateTo)
        cleanedFilters.cooperationStartDateTo = value.cooperationStartDateTo;
      if (value.companyStartDateFrom)
        cleanedFilters.companyStartDateFrom = value.companyStartDateFrom;
      if (value.companyStartDateTo) cleanedFilters.companyStartDateTo = value.companyStartDateTo;
      if (customFilters.length > 0) cleanedFilters.customFieldFilters = customFilters;

      return cleanedFilters;
    },
    []
  );

  // Use ref for debouncedSearch to avoid stale closure in form.watch callback
  const debouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  // Watch form changes and update filters with debounced search
  // Note: form.watch returns a stable subscription, form object itself is stable from useForm
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
        // Debounce search changes - use transition only for search to prevent UI blocking
        searchTimeoutRef.current = setTimeout(() => {
          setDebouncedSearch(currentSearch);
          startTransition(() => {
            onFiltersChange(
              buildFilters(
                value as Partial<ClientFiltersFormData>,
                currentSearch,
                customFieldFiltersRef.current
              )
            );
          });
        }, SEARCH_DEBOUNCE_MS);
      } else {
        // Direct update for instant operations (dropdowns, checkboxes)
        // No transition needed - these are fast and shouldn't show "Filtrowanie..." spinner
        onFiltersChange(
          buildFilters(
            value as Partial<ClientFiltersFormData>,
            debouncedSearchRef.current,
            customFieldFiltersRef.current
          )
        );
      }
    });

    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // form object is stable from useForm, but we need it in the closure
    // onFiltersChange and buildFilters are memoized callbacks
  }, [form, onFiltersChange, buildFilters]);

  const handleCustomFieldFiltersChange = useCallback(
    (newCustomFilters: CustomFieldFilter[]) => {
      setCustomFieldFilters(newCustomFilters);
      const formValues = form.getValues();
      // Direct update for custom field filters - these are instant operations
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
    [
      filters.amlGroupEnum,
      filters.gtuCode,
      filters.pkdCode,
      filters.cooperationStartDateFrom,
      filters.cooperationStartDateTo,
      filters.companyStartDateFrom,
      filters.companyStartDateTo,
    ]
  );

  return (
    <Card className="border-border">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 text-left select-none"
              aria-expanded={filtersOpen}
            >
              <Filter className="text-primary h-4 w-4" aria-hidden="true" />
              <span className="text-foreground font-medium">Filtry</span>
              {isPending && (
                <span className="text-muted-foreground animate-pulse text-xs">Filtrowanie...</span>
              )}
              {hasActiveFilters && !isPending && (
                <span className="bg-primary rounded px-1.5 py-0.5 text-xs text-white">Aktywne</span>
              )}
              <ChevronDown
                className={cn('ml-auto h-4 w-4 transition-transform', filtersOpen && 'rotate-180')}
                aria-hidden="true"
              />
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
              className="mt-2 ml-auto text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Wyczyść filtry
            </Button>
          )}
          <CollapsibleContent>
            <Form {...form}>
              <form className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <FormField
                    control={form.control}
                    name="search"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="text-xs">Szukaj</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                            <Input placeholder="Nazwa, NIP, email..." className="pl-8" {...field} />
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
                            {Object.entries(EmploymentTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                            {Object.entries(VatStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                            {Object.entries(TaxSchemeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                            {Object.entries(ZusStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                          value={
                            field.value === undefined ? '_all' : field.value ? 'true' : 'false'
                          }
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
                      className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        Filtry zaawansowane
                        {hasAdvancedFilters && (
                          <span className="bg-primary rounded px-1.5 py-0.5 text-xs text-white">
                            Aktywne
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {/* Date Range: Cooperation Start Date */}
                      <FormField
                        control={form.control}
                        name="cooperationStartDateFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Data współpracy od</FormLabel>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} />
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
                              <DatePicker value={field.value} onChange={field.onChange} />
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
                              <DatePicker value={field.value} onChange={field.onChange} />
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
                              <DatePicker value={field.value} onChange={field.onChange} />
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
                                {Object.entries(AmlGroupLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
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
});
