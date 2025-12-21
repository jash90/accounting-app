import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import { EmploymentType, VatStatus, TaxScheme, ZusStatus } from '@/types/enums';
import { ClientFiltersDto } from '@/types/dtos';

interface ClientFiltersProps {
  filters: ClientFiltersDto;
  onFiltersChange: (filters: ClientFiltersDto) => void;
}

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'DG',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 etatu poniżej min.',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 etatu powyżej min.',
};

const VAT_STATUS_LABELS: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT miesięczny',
  [VatStatus.VAT_QUARTERLY]: 'VAT kwartalny',
  [VatStatus.NO]: 'Nie',
  [VatStatus.NO_WATCH_LIMIT]: 'Nie (obserwuj limit)',
};

const TAX_SCHEME_LABELS: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Zasady ogólne',
};

const ZUS_STATUS_LABELS: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny',
  [ZusStatus.PREFERENTIAL]: 'Preferencyjny',
  [ZusStatus.NONE]: 'Brak',
};

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

  // Watch form changes and update filters
  useEffect(() => {
    const subscription = form.watch((value) => {
      const cleanedFilters: ClientFiltersDto = {};

      if (value.search) cleanedFilters.search = value.search;
      if (value.employmentType) cleanedFilters.employmentType = value.employmentType as EmploymentType;
      if (value.vatStatus) cleanedFilters.vatStatus = value.vatStatus as VatStatus;
      if (value.taxScheme) cleanedFilters.taxScheme = value.taxScheme as TaxScheme;
      if (value.zusStatus) cleanedFilters.zusStatus = value.zusStatus as ZusStatus;
      if (value.isActive !== undefined) cleanedFilters.isActive = value.isActive;

      onFiltersChange(cleanedFilters);
    });

    return () => subscription.unsubscribe();
  }, [form, onFiltersChange]);

  const handleClearFilters = () => {
    form.reset({
      search: '',
      employmentType: undefined,
      vatStatus: undefined,
      taxScheme: undefined,
      zusStatus: undefined,
      isActive: undefined,
    });
    onFiltersChange({});
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(
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
                        {Object.entries(VAT_STATUS_LABELS).map(
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
                        {Object.entries(TAX_SCHEME_LABELS).map(
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
                        {Object.entries(ZUS_STATUS_LABELS).map(
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
