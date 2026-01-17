import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TaskStatus,
  TaskStatusLabels,
  TaskPriority,
  TaskPriorityLabels,
  UserRole,
} from '@/types/enums';
import { CreateTaskDto } from '@/types/dtos';
import {
  useCreateTask,
  useTaskLabels,
  useTaskAssignees,
  useTaskClients,
} from '@/lib/hooks/use-tasks';
import { useAuthContext } from '@/contexts/auth-context';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, ArrowLeft, Plus, X, Loader2, CheckSquare } from 'lucide-react';

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

const storyPointOptions = [1, 2, 3, 5, 8, 13];

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const parentTaskId = searchParams.get('parentTaskId') || undefined;

  const createTask = useCreateTask();
  const { data: assigneesData } = useTaskAssignees();
  const { data: clientsData } = useTaskClients();
  const { data: labelsData } = useTaskLabels();

  const assignees = useMemo(() => assigneesData || [], [assigneesData]);
  const clients = useMemo(() => clientsData || [], [clientsData]);
  const labels = useMemo(() => labelsData?.data || [], [labelsData]);

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/tasks';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/tasks';
      default:
        return '/modules/tasks';
    }
  };

  const basePath = getBasePath();

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

  const handleSubmit = async (data: TaskFormData) => {
    const submitData: CreateTaskDto = {
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

    await createTask.mutateAsync(submitData);
    navigate(`${basePath}/list`);
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Nowe zadanie"
        description="Utwórz nowe zadanie w systemie"
        icon={<CheckSquare className="h-6 w-6" />}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - left column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Podstawowe informacje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tytuł *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Wpisz tytuł zadania"
                            className="text-lg"
                            {...field}
                          />
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
                          <Textarea
                            placeholder="Opisz szczegóły zadania, wymagania, kryteria akceptacji..."
                            className="min-h-[200px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Możesz użyć formatowania Markdown
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Labels Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Etykiety</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => {
                      const isSelected = selectedLabelIds.includes(label.id);
                      return (
                        <Badge
                          key={label.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer text-sm py-1.5 px-3"
                          style={
                            isSelected
                              ? { backgroundColor: label.color, borderColor: label.color }
                              : { borderColor: label.color, color: label.color }
                          }
                          onClick={() => toggleLabel(label.id)}
                        >
                          {label.name}
                          {isSelected && <X className="ml-1.5 h-3.5 w-3.5" />}
                        </Badge>
                      );
                    })}
                    {labels.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        Brak dostępnych etykiet. Dodaj etykiety w ustawieniach zadań.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - right column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status i priorytet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                          <PopoverContent className="w-auto p-0" align="start">
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
                          <PopoverContent className="w-auto p-0" align="start">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Przypisanie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Przypisany do</FormLabel>
                        <FormControl>
                          <Combobox
                            options={assignees.map((assignee) => ({
                              value: assignee.id,
                              label: `${assignee.firstName} ${assignee.lastName}`,
                            }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Nieprzypisane"
                            searchPlaceholder="Szukaj pracownika..."
                            emptyText="Nie znaleziono pracownika"
                          />
                        </FormControl>
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
                        <FormControl>
                          <Combobox
                            options={clients.map((client) => ({
                              value: client.id,
                              label: client.name,
                            }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Brak klienta"
                            searchPlaceholder="Szukaj klienta..."
                            emptyText="Nie znaleziono klienta"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estymacja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                              field.onChange(
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              size="sm"
                              className="min-w-[40px]"
                              onClick={() =>
                                field.onChange(field.value === points ? null : points)
                              }
                            >
                              {points}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={createTask.isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Plus className="mr-2 h-4 w-4" />
              Utwórz zadanie
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
