
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { usePkdSearch } from '@/lib/hooks/use-pkd-search';
import { AmlGroup } from '@/types/enums';

import { type FormSectionProps } from './types';

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
