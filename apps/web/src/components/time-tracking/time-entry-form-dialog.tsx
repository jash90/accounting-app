import { memo, useCallback, useMemo } from 'react';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/auth-context';
import { useSettlements } from '@/lib/hooks/use-settlements';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useCreateTimeEntry, useUpdateTimeEntry } from '@/lib/hooks/use-time-tracking';
import { type CreateTimeEntryDto, type TimeEntryResponseDto } from '@/types/dtos';

/**
 * Zod validation schema for time entry form.
 * Provides client-side validation for time entries.
 */
const timeEntryFormSchema = z
  .object({
    workType: z.enum(['task', 'settlement']),
    description: z.string().max(255, 'Opis może mieć maksymalnie 255 znaków').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Nieprawidłowy format czasu')
      .optional()
      .or(z.literal('')),
    clientId: z.string().optional(),
    taskId: z.string().optional(),
    settlementId: z.string().optional(),
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
  )
  .refine(
    (data) => {
      if (data.workType === 'task') return !!data.taskId && data.taskId !== '__none__';
      return true;
    },
    { message: 'Wybierz zadanie', path: ['taskId'] }
  )
  .refine(
    (data) => {
      if (data.workType === 'settlement')
        return !!data.settlementId && data.settlementId !== '__none__';
      return true;
    },
    { message: 'Wybierz rozliczenie', path: ['settlementId'] }
  );

type FormData = z.infer<typeof timeEntryFormSchema>;

interface TimeEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntryResponseDto | null;
}

export const TimeEntryFormDialog = memo(function TimeEntryFormDialog({
  open,
  onOpenChange,
  entry,
}: TimeEntryFormDialogProps) {
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const { user } = useAuthContext();

  const form = useForm<FormData>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      workType: 'task',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      endTime: '',
      clientId: '',
      taskId: '',
      settlementId: '',
      isBillable: true,
      hourlyRate: '',
      tags: '',
    },
  });

  const workType = form.watch('workType');

  const { data: tasksData } = useTasks({ limit: 100, assigneeId: user?.id });
  const { data: settlementsData } = useSettlements({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 100,
  });

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData?.data]);
  const settlements = useMemo(() => settlementsData?.data ?? [], [settlementsData?.data]);

  const { reset } = form;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        if (entry) {
          // Handle both Date objects and ISO strings for timezone-safe parsing
          const startDate =
            entry.startTime instanceof Date ? entry.startTime : parseISO(entry.startTime as string);
          const endDate = entry.endTime
            ? entry.endTime instanceof Date
              ? entry.endTime
              : parseISO(entry.endTime as string)
            : null;
          const workType = entry.taskId ? 'task' : 'settlement';
          reset({
            workType,
            description: entry.description || '',
            date: format(startDate, 'yyyy-MM-dd'),
            startTime: format(startDate, 'HH:mm'),
            endTime: endDate ? format(endDate, 'HH:mm') : '',
            clientId: '',
            taskId: entry.taskId || '',
            settlementId: entry.settlementId || '',
            isBillable: entry.isBillable,
            hourlyRate: entry.hourlyRate?.toString() || '',
            tags: entry.tags?.join(', ') || '',
          });
        } else {
          reset({
            workType: 'task',
            description: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: format(new Date(), 'HH:mm'),
            endTime: '',
            clientId: '',
            taskId: '',
            settlementId: '',
            isBillable: true,
            hourlyRate: '',
            tags: '',
          });
        }
      }
      onOpenChange(newOpen);
    },
    [entry, reset, onOpenChange]
  );

  const onSubmit = useCallback(
    (data: FormData) => {
      // Use date-fns parse for consistent timezone handling across DST boundaries
      const startDateTime = parse(`${data.date} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const endDateTime = data.endTime
        ? parse(`${data.date} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date())
        : undefined;

      const selectedTask =
        data.workType === 'task' ? tasks.find((t) => t.id === data.taskId) : undefined;
      const selectedSettlement =
        data.workType === 'settlement'
          ? settlements.find((s) => s.id === data.settlementId)
          : undefined;

      const entryData: CreateTimeEntryDto = {
        description: data.description || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime?.toISOString(),
        clientId: selectedTask?.clientId ?? selectedSettlement?.clientId,
        taskId:
          data.workType === 'task' && data.taskId && data.taskId !== '__none__'
            ? data.taskId
            : undefined,
        settlementId:
          data.workType === 'settlement' && data.settlementId && data.settlementId !== '__none__'
            ? data.settlementId
            : undefined,
        isBillable: data.isBillable,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        tags: data.tags
          ? data.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      };

      // When editing, explicitly clear the field that's no longer used
      if (entry) {
        if (data.workType === 'task') {
          (entryData as unknown as Record<string, unknown>).settlementId = null;
        } else {
          (entryData as unknown as Record<string, unknown>).taskId = null;
        }
      }

      if (entry) {
        updateEntry.mutate(
          { id: entry.id, data: entryData },
          {
            onSuccess: () => {
              onOpenChange(false);
            },
            onError: (error) => {
              if (import.meta.env.DEV) {
                console.error('Failed to update time entry:', error);
              }
            },
          }
        );
      } else {
        createEntry.mutate(entryData, {
          onSuccess: () => {
            onOpenChange(false);
          },
          onError: (error) => {
            if (import.meta.env.DEV) {
              console.error('Failed to create time entry:', error);
            }
          },
        });
      }
    },
    [entry, updateEntry, createEntry, onOpenChange, tasks, settlements]
  );

  const isLoading = createEntry.isPending || updateEntry.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              name="workType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ pracy</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        // Clear the other field when switching type
                        if (val === 'task') {
                          form.setValue('settlementId', '');
                        } else {
                          form.setValue('taskId', '');
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="task" id="workType-task" />
                        <label htmlFor="workType-task" className="cursor-pointer text-sm">
                          Zadanie
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="settlement" id="workType-settlement" />
                        <label htmlFor="workType-settlement" className="cursor-pointer text-sm">
                          Rozliczenie
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {workType === 'task' && (
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zadanie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz zadanie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Wybierz zadanie</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {workType === 'settlement' && (
              <FormField
                control={form.control}
                name="settlementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rozliczenie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rozliczenie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Wybierz rozliczenie</SelectItem>
                        {settlements.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.client?.name ? `${s.client.name} — ` : ''}
                            {s.month}/{s.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
});
