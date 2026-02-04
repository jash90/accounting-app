import { useEffect } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { format, parse, parseISO } from 'date-fns';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { useTaskClients } from '@/lib/hooks/use-tasks';
import { useCreateTimeEntry, useUpdateTimeEntry } from '@/lib/hooks/use-time-tracking';
import { type CreateTimeEntryDto, type TimeEntryResponseDto } from '@/types/dtos';

/**
 * Zod validation schema for time entry form.
 * Provides client-side validation for time entries.
 */
const timeEntryFormSchema = z
  .object({
    description: z.string().max(255, 'Opis może mieć maksymalnie 255 znaków').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu')
      .optional()
      .or(z.literal('')),
    clientId: z.string().optional(),
    isBillable: z.boolean(),
    hourlyRate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(parseFloat(val)), { message: 'Stawka musi być liczbą' }),
    tags: z.string().max(500, 'Tagi mogą mieć maksymalnie 500 znaków').optional(),
  })
  .refine(
    (data) => {
      if (!data.endTime) return true;
      return data.startTime < data.endTime;
    },
    { message: 'Czas zakończenia musi być późniejszy niż czas rozpoczęcia', path: ['endTime'] }
  );

type FormData = z.infer<typeof timeEntryFormSchema>;

interface TimeEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntryResponseDto | null;
}

export function TimeEntryFormDialog({ open, onOpenChange, entry }: TimeEntryFormDialogProps) {
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const { data: clientsData } = useTaskClients();

  const clients = clientsData || [];

  const form = useForm<FormData>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      endTime: '',
      clientId: '',
      isBillable: true,
      hourlyRate: '',
      tags: '',
    },
  });

  // Extract reset to satisfy exhaustive-deps (reset is stable from react-hook-form)
  const { reset } = form;

  useEffect(() => {
    if (entry) {
      // Handle both Date objects and ISO strings for timezone-safe parsing
      const startDate =
        entry.startTime instanceof Date ? entry.startTime : parseISO(entry.startTime as string);
      const endDate = entry.endTime
        ? entry.endTime instanceof Date
          ? entry.endTime
          : parseISO(entry.endTime as string)
        : null;
      reset({
        description: entry.description || '',
        date: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endTime: endDate ? format(endDate, 'HH:mm') : '',
        clientId: entry.clientId || '',
        isBillable: entry.isBillable,
        hourlyRate: entry.hourlyRate?.toString() || '',
        tags: entry.tags?.join(', ') || '',
      });
    } else {
      reset({
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: format(new Date(), 'HH:mm'),
        endTime: '',
        clientId: '',
        isBillable: true,
        hourlyRate: '',
        tags: '',
      });
    }
  }, [entry, open, reset]);

  const onSubmit = (data: FormData) => {
    // Use date-fns parse for consistent timezone handling across DST boundaries
    const startDateTime = parse(`${data.date} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const endDateTime = data.endTime
      ? parse(`${data.date} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date())
      : undefined;

    const entryData: CreateTimeEntryDto = {
      description: data.description || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime?.toISOString(),
      clientId: data.clientId && data.clientId !== '__none__' ? data.clientId : undefined,
      isBillable: data.isBillable,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    if (entry) {
      updateEntry.mutate(
        { id: entry.id, data: entryData },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
          onError: (error) => {
            console.error('Failed to update time entry:', error);
          },
        }
      );
    } else {
      createEntry.mutate(entryData, {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error) => {
          console.error('Failed to create time entry:', error);
        },
      });
    }
  };

  const isLoading = createEntry.isPending || updateEntry.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edytuj wpis czasu' : 'Nowy wpis czasu'}</DialogTitle>
          <DialogDescription>
            {entry ? 'Zaktualizuj dane wpisu czasu.' : 'Dodaj nowy wpis czasu ręcznie.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opisz wykonaną pracę..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Wybierz datę"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Początek</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Koniec</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klient</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || '__none__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz klienta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Brak klienta</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stawka godzinowa (PLN)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="np. 150.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagi (oddzielone przecinkami)</FormLabel>
                    <FormControl>
                      <Input placeholder="np. spotkanie, dev" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isBillable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Wpis rozliczalny</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Zapisywanie...' : entry ? 'Zapisz zmiany' : 'Dodaj wpis'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
