import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import {
  createSuspensionSchema,
  updateSuspensionSchema,
  type CreateSuspensionFormData,
  type UpdateSuspensionFormData,
} from '@/lib/validation/schemas';

import { type SuspensionResponseDto } from '../../lib/api/endpoints/suspensions';

interface SuspensionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suspension?: SuspensionResponseDto;
  onSubmit: (data: CreateSuspensionFormData | UpdateSuspensionFormData) => void;
  isLoading?: boolean;
}

export function SuspensionFormDialog({
  open,
  onOpenChange,
  suspension,
  onSubmit,
  isLoading = false,
}: SuspensionFormDialogProps) {
  const isEditing = !!suspension;
  const schema = isEditing ? updateSuspensionSchema : createSuspensionSchema;

  type FormData = CreateSuspensionFormData | UpdateSuspensionFormData;

  // Compute form values from props - React Hook Form's `values` prop
  // automatically syncs external data to form state without useEffect
  const formValues: FormData = isEditing
    ? {
        endDate: suspension.endDate ? new Date(suspension.endDate) : undefined,
        reason: suspension.reason ?? '',
      }
    : {
        startDate: undefined,
        endDate: undefined,
        reason: '',
      };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: open ? formValues : undefined, // Only sync when dialog is open
    resetOptions: {
      keepDirtyValues: false, // Reset dirty values when `values` changes
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj zawieszenie' : 'Dodaj zawieszenie działalności'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data zawieszenia *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            aria-label="Wybierz datę zawieszenia"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'd MMMM yyyy', { locale: pl })
                            ) : (
                              <span>Wybierz datę zawieszenia</span>
                            )}
                            <CalendarIcon
                              className="ml-auto h-4 w-4 opacity-50"
                              aria-hidden="true"
                            />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={pl}
                          disabled={(date) => date < startOfToday()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Data od której klient zawiesza działalność (nie może być w przeszłości)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data odwieszenia (opcjonalna)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          aria-label="Wybierz datę odwieszenia"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'd MMMM yyyy', { locale: pl })
                          ) : (
                            <span>Wybierz datę odwieszenia</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        locale={pl}
                        disabled={(date) => {
                          const startDate = form.getValues('startDate');
                          // For create: endDate must be after startDate
                          // For edit: endDate must be at least today
                          if (startDate) {
                            return date <= startDate;
                          }
                          return date < startOfToday();
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Pozostaw puste jeśli data odwieszenia nie jest jeszcze znana
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powód zawieszenia (opcjonalny)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="np. Zawieszenie na wniosek klienta, planowany urlop macierzyński..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isLoading || form.formState.isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj zawieszenie'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
