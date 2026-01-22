import { useForm } from 'react-hook-form';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Building2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/lib/api/query-client';
import { useCreateTask, useTaskAssignees } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import { type CreateTaskDto } from '@/types/dtos';
import { TaskPriority, TaskPriorityLabels } from '@/types/enums';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

interface FormData {
  title: string;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
}

export function QuickAddTaskDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: QuickAddTaskDialogProps) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const { data: assignees } = useTaskAssignees();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      priority: TaskPriority.MEDIUM,
    },
  });

  const selectedPriority = watch('priority');
  const selectedAssigneeId = watch('assigneeId');
  const selectedDueDate = watch('dueDate');

  const onSubmit = async (data: FormData) => {
    const taskData: CreateTaskDto = {
      title: data.title,
      priority: data.priority,
      clientId,
      assigneeId: data.assigneeId || undefined,
      dueDate: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : undefined,
    };

    createTask.mutate(taskData, {
      onSuccess: () => {
        // Invalidate both tasks list and client statistics
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.clientStatistics(clientId),
        });
        reset();
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Szybkie dodawanie zadania</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Klient: <span className="font-medium">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Tytuł zadania <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Wprowadź tytuł zadania..."
              {...register('title', {
                required: 'Tytuł jest wymagany',
                minLength: {
                  value: 3,
                  message: 'Tytuł musi mieć co najmniej 3 znaki',
                },
              })}
            />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priorytet</Label>
            <Select
              value={selectedPriority}
              onValueChange={(value) => setValue('priority', value as TaskPriority)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz priorytet" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Przypisz do</Label>
            <Select
              value={selectedAssigneeId || ''}
              onValueChange={(value) =>
                setValue('assigneeId', value === 'none' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz osobę" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nie przypisuj</SelectItem>
                {assignees?.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.firstName} {assignee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Termin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDueDate
                    ? format(selectedDueDate, 'PPP', { locale: pl })
                    : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDueDate}
                  onSelect={(date) => setValue('dueDate', date)}
                  initialFocus
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createTask.isPending}
              className="bg-apptax-blue hover:bg-apptax-blue/90"
            >
              {(isSubmitting || createTask.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Utwórz zadanie
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
