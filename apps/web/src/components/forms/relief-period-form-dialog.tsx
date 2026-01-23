import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { addMonths, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ReliefType,
  ReliefTypeDurationMonths,
  ReliefTypeLabels,
  type ReliefPeriodResponseDto,
} from '@/lib/api/endpoints/relief-periods';
import { cn } from '@/lib/utils/cn';
import {
  createReliefPeriodSchema,
  updateReliefPeriodSchema,
  type CreateReliefPeriodFormData,
  type UpdateReliefPeriodFormData,
} from '@/lib/validation/schemas';

// Re-export types for convenience
export type { CreateReliefPeriodFormData, UpdateReliefPeriodFormData };

// ============================================
// Component
// ============================================

interface ReliefPeriodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reliefPeriod?: ReliefPeriodResponseDto;
  onSubmit: (data: CreateReliefPeriodFormData | UpdateReliefPeriodFormData) => void;
  isLoading?: boolean;
  existingReliefTypes?: ReliefType[];
}

export function ReliefPeriodFormDialog({
  open,
  onOpenChange,
  reliefPeriod,
  onSubmit,
  isLoading = false,
  existingReliefTypes = [],
}: ReliefPeriodFormDialogProps) {
  const isEditing = !!reliefPeriod;
  const schema = isEditing ? updateReliefPeriodSchema : createReliefPeriodSchema;

  // Popover state for controlled closing on date selection
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  type ReliefFormData = CreateReliefPeriodFormData | UpdateReliefPeriodFormData;

  const form = useForm<ReliefFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditing
      ? {
          startDate: reliefPeriod.startDate ? new Date(reliefPeriod.startDate) : undefined,
          endDate: reliefPeriod.endDate ? new Date(reliefPeriod.endDate) : undefined,
          isActive: reliefPeriod.isActive,
        }
      : {
          reliefType: undefined,
          startDate: undefined,
          endDate: undefined,
        },
  });

  // Reset form when dialog opens/closes or relief period changes
  useEffect(() => {
    if (!open) return;

    if (isEditing && reliefPeriod) {
      form.reset({
        startDate: reliefPeriod.startDate ? new Date(reliefPeriod.startDate) : undefined,
        endDate: reliefPeriod.endDate ? new Date(reliefPeriod.endDate) : undefined,
        isActive: reliefPeriod.isActive,
      });
    } else {
      form.reset({
        reliefType: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    }
  }, [open, isEditing, reliefPeriod, form]);

  // Auto-calculate end date when start date or relief type changes (only for create)
  const watchStartDate = form.watch('startDate');
  const watchReliefType = form.watch('reliefType');

  useEffect(() => {
    if (!isEditing && watchStartDate && watchReliefType) {
      const duration = ReliefTypeDurationMonths[watchReliefType as ReliefType];
      const calculatedEndDate = addMonths(watchStartDate, duration);
      form.setValue('endDate', calculatedEndDate);
    }
  }, [watchStartDate, watchReliefType, isEditing, form]);

  const handleSubmit = (data: ReliefFormData) => {
    onSubmit(data);
  };

  // Filter out already used relief types (for create mode)
  const availableReliefTypes = Object.values(ReliefType).filter(
    (type) => !existingReliefTypes.includes(type)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj ulgę' : 'Dodaj ulgę ZUS'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Zmień daty obowiązywania ulgi ZUS dla tego klienta.'
              : 'Dodaj nową ulgę ZUS (Ulga na start lub Mały ZUS) dla tego klienta.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="reliefType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ ulgi *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ ulgi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableReliefTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ReliefTypeLabels[type]} ({ReliefTypeDurationMonths[type]} mies.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableReliefTypes.length === 0 && (
                      <FormDescription className="text-amber-600">
                        Wszystkie typy ulg są już przypisane do tego klienta
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data rozpoczęcia {!isEditing && '*'}</FormLabel>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          aria-label="Wybierz datę rozpoczęcia"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'd MMMM yyyy', { locale: pl })
                          ) : (
                            <span>Wybierz datę rozpoczęcia</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setStartDateOpen(false);
                        }}
                        locale={pl}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {!isEditing
                      ? 'Data rozpoczęcia korzystania z ulgi ZUS'
                      : 'Zmień datę rozpoczęcia ulgi'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data zakończenia</FormLabel>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          aria-label="Wybierz datę zakończenia"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'd MMMM yyyy', { locale: pl })
                          ) : (
                            <span>Wybierz datę zakończenia</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(date) => {
                          field.onChange(date);
                          setEndDateOpen(false);
                        }}
                        locale={pl}
                        disabled={(date) => {
                          const startDate = form.getValues('startDate');
                          if (startDate) {
                            return date <= startDate;
                          }
                          return false;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {!isEditing
                      ? 'Automatycznie obliczona na podstawie typu ulgi'
                      : 'Możesz zmienić datę zakończenia ulgi'}
                  </FormDescription>
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
                disabled={
                  isLoading ||
                  form.formState.isSubmitting ||
                  (!isEditing && availableReliefTypes.length === 0)
                }
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                {isLoading ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj ulgę'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
