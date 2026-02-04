import { type Control, type FieldPath, type FieldValues } from 'react-hook-form';


import { DatePicker } from '@/components/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toDateString } from '@/lib/utils/date';

/**
 * Props for DateFormField component
 */
interface DateFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  required?: boolean;
}

/**
 * Helper function to format date value for DatePicker.
 * Uses toDateString utility to avoid timezone issues.
 */
function formatDateValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date || typeof value === 'string') {
    return toDateString(value as Date | string);
  }
  return undefined;
}

/**
 * Reusable Date form field with react-hook-form integration
 * Uses custom DatePicker component with Polish locale
 */
export function DateFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, required = false }: DateFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && ' *'}
          </FormLabel>
          <FormControl>
            <DatePicker
              value={formatDateValue(field.value)}
              onChange={(value) => {
                if (!value) {
                  field.onChange(undefined);
                  return;
                }
                // Parse as local date to avoid timezone issues
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
  );
}
