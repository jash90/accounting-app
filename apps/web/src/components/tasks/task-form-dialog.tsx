import { useEffect, useMemo } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2, Maximize2, X } from 'lucide-react';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/auth-context';
import { useTaskAssignees, useTaskClients, useTaskLabels } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import { type CreateTaskDto, type TaskResponseDto, type UpdateTaskDto } from '@/types/dtos';
import {
  TaskPriority,
  TaskPriorityLabels,
  TaskStatus,
  TaskStatusLabels,
  UserRole,
} from '@/types/enums';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').max(255),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  dueDate: z.date().optional().nullable(),
  startDate: z.date().optional().nullable(),
  estimatedMinutes: z.number().min(0).optional().nullable(),
  storyPoints: z.number().min(1).max(13).optional().nullable(),
  clientId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskResponseDto | null;
  parentTaskId?: string;
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  isLoading?: boolean;
}

const storyPointOptions = [1, 2, 3, 5, 8, 13];

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  parentTaskId,
  onSubmit,
  isLoading = false,
}: TaskFormDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const isEditing = !!task;
  const { data: assigneesData } = useTaskAssignees();
  const { data: clientsData } = useTaskClients();
  const { data: labelsData } = useTaskLabels();

  const getCreatePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks/create';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks/create';
      default:
        return '/modules/tasks/create';
    }
  };

  const handleMaximize = () => {
    onOpenChange(false);
    navigate(getCreatePath());
  };

  const assignees = useMemo(() => assigneesData || [], [assigneesData]);
  const clients = useMemo(() => clientsData || [], [clientsData]);
  const labels = useMemo(() => labelsData?.data || [], [labelsData]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      startDate: null,
      estimatedMinutes: null,
      storyPoints: null,
      clientId: null,
      assigneeId: null,
      parentTaskId: parentTaskId || null,
      labelIds: [],
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        startDate: task.startDate ? new Date(task.startDate) : null,
        estimatedMinutes: task.estimatedMinutes || null,
        storyPoints: task.storyPoints || null,
        clientId: task.clientId || null,
        assigneeId: task.assigneeId || null,
        parentTaskId: task.parentTaskId || parentTaskId || null,
        labelIds: task.labels?.map((la) => la.labelId) || [],
      });
    } else {
      form.reset({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: null,
        startDate: null,
        estimatedMinutes: null,
        storyPoints: null,
        clientId: null,
        assigneeId: null,
        parentTaskId: parentTaskId || null,
        labelIds: [],
      });
    }
  }, [task, parentTaskId, form]);

  const handleSubmit = async (data: TaskFormData) => {
    const submitData: CreateTaskDto | UpdateTaskDto = {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate || undefined,
      startDate: data.startDate || undefined,
      estimatedMinutes: data.estimatedMinutes || undefined,
      storyPoints: data.storyPoints || undefined,
      clientId: data.clientId || undefined,
      assigneeId: data.assigneeId || undefined,
      parentTaskId: data.parentTaskId || undefined,
      labelIds: data.labelIds,
    };

    await onSubmit(submitData);
    onOpenChange(false);
  };

  const selectedLabelIds = form.watch('labelIds') || [];

  const toggleLabel = (labelId: string) => {
    const current = form.getValues('labelIds') || [];
    if (current.includes(labelId)) {
      form.setValue(
        'labelIds',
        current.filter((id) => id !== labelId)
      );
    } else {
      form.setValue('labelIds', [...current, labelId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? 'Edytuj zadanie' : 'Nowe zadanie'}</DialogTitle>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleMaximize}
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Maksymalizuj
              </Button>
            )}
          </div>
          <DialogDescription>
            {isEditing ? 'Zmień szczegóły zadania' : 'Utwórz nowe zadanie w systemie'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł *</FormLabel>
                  <FormControl>
                    <Input placeholder="Wpisz tytuł zadania" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opisz zadanie..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TaskStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorytet</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data rozpoczęcia</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, 'PPP', { locale: pl })
                              : 'Wybierz datę'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="z-[200] w-auto p-0" align="start" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={pl}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Termin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, 'PPP', { locale: pl })
                              : 'Wybierz datę'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="z-[200] w-auto p-0" align="start" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={pl}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estimated time - full width */}
            <FormField
              control={form.control}
              name="estimatedMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estymowany czas (minuty)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="np. 60"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Story Points - full width with larger buttons */}
            <FormField
              control={form.control}
              name="storyPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Points</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {storyPointOptions.map((points) => (
                      <Button
                        key={points}
                        type="button"
                        variant={field.value === points ? 'default' : 'outline'}
                        size="default"
                        className="min-w-[44px]"
                        onClick={() => field.onChange(field.value === points ? null : points)}
                      >
                        {points}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee and Client */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Przypisany do</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz osobę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nieprzypisane</SelectItem>
                        {assignees.map((assignee) => (
                          <SelectItem key={assignee.id} value={assignee.id}>
                            {assignee.firstName} {assignee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Klient</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz klienta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak klienta</SelectItem>
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
            </div>

            {/* Labels */}
            <FormItem>
              <FormLabel>Etykiety</FormLabel>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const isSelected = selectedLabelIds.includes(label.id);
                  return (
                    <Badge
                      key={label.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      style={
                        isSelected
                          ? { backgroundColor: label.color, borderColor: label.color }
                          : { borderColor: label.color, color: label.color }
                      }
                      onClick={() => toggleLabel(label.id)}
                    >
                      {label.name}
                      {isSelected && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  );
                })}
                {labels.length === 0 && (
                  <span className="text-muted-foreground text-sm">Brak dostępnych etykiet</span>
                )}
              </div>
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Zapisz zmiany' : 'Utwórz zadanie'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
