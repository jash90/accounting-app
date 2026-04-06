import { DatePicker } from '@/components/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { type ClientFormInstance } from './types';

interface DatesSectionProps {
  form: ClientFormInstance;
}

export function DatesSection({ form }: DatesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-foreground text-sm font-semibold">Daty</h3>

      <div className="grid grid-cols-2 items-end gap-4">
        <FormField
          control={form.control}
          name="companyStartDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex min-h-[40px] items-end">Data rozpoczęcia firmy</FormLabel>
              <FormControl>
                <DatePicker
                  value={
                    field.value instanceof Date
                      ? field.value.toISOString().split('T')[0]
                      : undefined
                  }
                  onChange={(value) => {
                    if (!value) {
                      field.onChange(undefined);
                      return;
                    }
                    const [year, month, day] = value.split('-').map(Number);
                    field.onChange(new Date(year, month - 1, day));
                  }}
                  placeholder="Wybierz datę"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cooperationStartDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data rozpoczęcia współpracy</FormLabel>
              <FormControl>
                <DatePicker
                  value={
                    field.value instanceof Date
                      ? field.value.toISOString().split('T')[0]
                      : undefined
                  }
                  onChange={(value) => {
                    if (!value) {
                      field.onChange(undefined);
                      return;
                    }
                    const [year, month, day] = value.split('-').map(Number);
                    field.onChange(new Date(year, month - 1, day));
                  }}
                  placeholder="Wybierz datę"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
