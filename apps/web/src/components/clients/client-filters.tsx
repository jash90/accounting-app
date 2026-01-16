import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Search, X, Filter } from 'lucide-react';
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
} from '@/types/enums';
import { ClientFiltersDto } from '@/types/dtos';

interface ClientFiltersProps {
  filters: ClientFiltersDto;
  onFiltersChange: (filters: ClientFiltersDto) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const form = useForm<ClientFiltersFormData>({
    resolver: zodResolver(clientFiltersSchema),
    defaultValues: {
      search: filters.search || '',
      employmentType: filters.employmentType,
      vatStatus: filters.vatStatus,
      taxScheme: filters.taxScheme,
      zusStatus: filters.zusStatus,
      isActive: filters.isActive,
    },
  });

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build filters object from form values
  const buildFilters = useCallback((value: Partial<ClientFiltersFormData>, searchValue: string): ClientFiltersDto => {
    const cleanedFilters: ClientFiltersDto = {};

    if (searchValue) cleanedFilters.search = searchValue;
    if (value.employmentType) cleanedFilters.employmentType = value.employmentType as EmploymentType;
    if (value.vatStatus) cleanedFilters.vatStatus = value.vatStatus as VatStatus;
    if (value.taxScheme) cleanedFilters.taxScheme = value.taxScheme as TaxScheme;
    if (value.zusStatus) cleanedFilters.zusStatus = value.zusStatus as ZusStatus;
    if (value.isActive !== undefined) cleanedFilters.isActive = value.isActive;

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
          onFiltersChange(buildFilters(value, currentSearch));
        }, SEARCH_DEBOUNCE_MS);
      } else {
        // Immediate update for non-search filters
        onFiltersChange(buildFilters(value, debouncedSearch));
      }
    });

    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form, onFiltersChange, debouncedSearch, buildFilters]);

  const handleClearFilters = useCallback(() => {
    // Reset debounced search to sync with form reset
    setDebouncedSearch('');
    // Reset form - watch subscription will call onFiltersChange automatically
    form.reset({
      search: '',
      employmentType: undefined,
      vatStatus: undefined,
      taxScheme: undefined,
      zusStatus: undefined,
      isActive: undefined,
    });
    // Note: Do NOT call onFiltersChange({}) here - the watch subscription handles it
  }, [form]);

  const hasActiveFilters =
    filters.search ||
    filters.employmentType ||
    filters.vatStatus ||
    filters.taxScheme ||
    filters.zusStatus ||
    filters.isActive !== undefined;

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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
