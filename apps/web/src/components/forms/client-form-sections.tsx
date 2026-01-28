import { type Control, type FieldValues } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { usePkdSearch } from '@/lib/hooks/use-pkd-search';
import { type ClientFieldDefinition } from '@/types/entities';
import {
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  AmlGroup,
} from '@/types/enums';

import { SelectFormField, DateFormField } from './shared-form-fields';

interface FormSectionProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
}

/**
 * Basic Information Card - Name, NIP, Email, Phone, Email Copy Switch
 */
export function BasicInfoCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dane podstawowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa klienta *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nazwa firmy lub imię i nazwisko"
                  className="text-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="nip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP</FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input placeholder="+48 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="receiveEmailCopy"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Wyślij email powitalny do klienta</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Klient otrzyma email z podsumowaniem wprowadzonych danych
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Tax and Employment Card - Employment Type, VAT Status, Tax Scheme, ZUS Status
 */
export function TaxEmploymentCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podatki i zatrudnienie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectFormField
            control={control}
            name="employmentType"
            label="Forma zatrudnienia"
            options={EmploymentTypeLabels}
          />

          <SelectFormField
            control={control}
            name="vatStatus"
            label="Status VAT"
            options={VatStatusLabels}
          />

          <SelectFormField
            control={control}
            name="taxScheme"
            label="Forma opodatkowania"
            options={TaxSchemeLabels}
          />

          <SelectFormField
            control={control}
            name="zusStatus"
            label="Status ZUS"
            options={ZusStatusLabels}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Additional Information Card - PKD, GTU, AML, Company Specificity, Additional Info
 */
export function AdditionalInfoCard({ control }: FormSectionProps) {
  // Use server-side PKD search instead of static 657 codes
  const {
    options: pkdOptions,
    groups: pkdGroups,
    setSearch: setPkdSearch,
    isLoading: isPkdLoading,
  } = usePkdSearch();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dodatkowe informacje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="pkdCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Główny kod PKD</FormLabel>
              <FormControl>
                <GroupedCombobox
                  options={pkdOptions}
                  groups={pkdGroups}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value || '')}
                  onSearchChange={setPkdSearch}
                  isLoading={isPkdLoading}
                  placeholder="Wybierz kod PKD"
                  searchPlaceholder="Szukaj kodu PKD..."
                  emptyText="Nie znaleziono kodu"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="gtuCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kod GTU</FormLabel>
                <FormControl>
                  <Combobox
                    options={GTU_CODES.map((gtu) => ({
                      value: gtu.code,
                      label: gtu.label,
                    }))}
                    value={field.value || null}
                    onChange={(value) => field.onChange(value || '')}
                    placeholder="Wybierz kod GTU"
                    searchPlaceholder="Szukaj kodu GTU..."
                    emptyText="Nie znaleziono kodu"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="amlGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupa AML</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz grupę ryzyka" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(AmlGroup).map((group) => (
                      <SelectItem key={group} value={group}>
                        {AmlGroupLabels[group]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="companySpecificity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specyfika firmy</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Opisz specyfikę działalności..."
                  className="min-h-[100px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="additionalInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dodatkowe informacje</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dodatkowe uwagi..."
                  className="min-h-[100px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Dates Card - Company Start Date, Cooperation Start Date
 */
export function DatesCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DateFormField control={control} name="companyStartDate" label="Data rozpoczęcia firmy" />

        <DateFormField
          control={control}
          name="cooperationStartDate"
          label="Data rozpoczęcia współpracy"
        />
      </CardContent>
    </Card>
  );
}

interface CustomFieldsCardProps {
  definitions: ClientFieldDefinition[];
  values: Record<string, string>;
  isSubmitted: boolean;
  renderField: (definition: ClientFieldDefinition) => React.ReactNode;
}

/**
 * Custom Fields Card - Renders dynamic custom field definitions
 */
export function CustomFieldsCard({
  definitions,
  values,
  isSubmitted,
  renderField,
}: CustomFieldsCardProps) {
  if (definitions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pola niestandardowe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {definitions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((definition) => {
              // Helper to check for empty values (handles 0, false, empty string correctly)
              const isEmpty = (v: unknown) => v === undefined || v === null || v === '';
              return (
                <div key={definition.id} className="space-y-2">
                  <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {definition.label}
                    {definition.isRequired && ' *'}
                  </label>
                  {renderField(definition)}
                  {definition.isRequired && isEmpty(values[definition.id]) && isSubmitted && (
                    <p className="text-destructive text-sm font-medium">To pole jest wymagane</p>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
