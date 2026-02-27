import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale/pl';
import { ArrowLeft, Copy, Edit, LayoutTemplate, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/contexts/auth-context';
import { type CreateTaskTemplateDto, type RecurrencePatternDto } from '@/lib/api/endpoints/tasks';
import { useCrudDialogs } from '@/lib/hooks/use-crud-dialogs';
import { useModulePermissions } from '@/lib/hooks/use-permissions';
import {
  useCreateTaskFromTemplate,
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskAssignees,
  useTaskClients,
  useTaskTemplates,
  useUpdateTaskTemplate,
  type TaskTemplateResponseDto,
} from '@/lib/hooks/use-tasks';
import { UserRole } from '@/types/enums';

function formatAssigneeName(assignee: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const fullName = `${assignee.firstName ?? ''} ${assignee.lastName ?? ''}`.trim();
  return fullName || assignee.email;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Nd' },
  { value: 1, label: 'Pn' },
  { value: 2, label: 'Wt' },
  { value: 3, label: 'Śr' },
  { value: 4, label: 'Cz' },
  { value: 5, label: 'Pt' },
  { value: 6, label: 'So' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Niski' },
  { value: 'MEDIUM', label: 'Średni' },
  { value: 'HIGH', label: 'Wysoki' },
  { value: 'URGENT', label: 'Pilny' },
];

interface TemplateFormState {
  title: string;
  description: string;
  priority: string;
  assigneeId: string;
  clientId: string;
  estimatedMinutes: string;
  hasRecurrence: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: string;
  daysOfWeek: number[];
  dayOfMonth: string;
  recurrenceEndDate: string;
}

const emptyForm: TemplateFormState = {
  title: '',
  description: '',
  priority: '',
  assigneeId: '',
  clientId: '',
  estimatedMinutes: '',
  hasRecurrence: false,
  frequency: 'weekly',
  interval: '1',
  daysOfWeek: [],
  dayOfMonth: '1',
  recurrenceEndDate: '',
};

function templateToForm(t: TaskTemplateResponseDto): TemplateFormState {
  const pattern = t.recurrencePattern as RecurrencePatternDto | null | undefined;
  return {
    title: t.title,
    description: t.description ?? '',
    priority: t.priority ?? '',
    assigneeId: t.assigneeId ?? '',
    clientId: t.clientId ?? '',
    estimatedMinutes: t.estimatedMinutes != null ? String(t.estimatedMinutes) : '',
    hasRecurrence: !!pattern,
    frequency: pattern?.frequency ?? 'weekly',
    interval: pattern?.interval != null ? String(pattern.interval) : '1',
    daysOfWeek: pattern?.daysOfWeek ?? [],
    dayOfMonth: pattern?.dayOfMonth != null ? String(pattern.dayOfMonth) : '1',
    recurrenceEndDate: t.recurrenceEndDate
      ? new Date(t.recurrenceEndDate).toISOString().split('T')[0]
      : '',
  };
}

function formToDto(form: TemplateFormState): CreateTaskTemplateDto {
  let recurrencePattern: RecurrencePatternDto | undefined;
  if (form.hasRecurrence) {
    recurrencePattern = {
      frequency: form.frequency,
      interval: parseInt(form.interval, 10) || 1,
      ...(form.frequency === 'weekly' && form.daysOfWeek.length > 0
        ? { daysOfWeek: form.daysOfWeek }
        : {}),
      ...(form.frequency === 'monthly' ? { dayOfMonth: parseInt(form.dayOfMonth, 10) || 1 } : {}),
    };
  }

  return {
    title: form.title,
    ...(form.description ? { description: form.description } : {}),
    ...(form.priority ? { priority: form.priority } : {}),
    ...(form.assigneeId ? { assigneeId: form.assigneeId } : {}),
    ...(form.clientId ? { clientId: form.clientId } : {}),
    ...(form.estimatedMinutes ? { estimatedMinutes: parseInt(form.estimatedMinutes, 10) } : {}),
    ...(recurrencePattern ? { recurrencePattern } : {}),
    ...(form.recurrenceEndDate ? { recurrenceEndDate: form.recurrenceEndDate } : {}),
  };
}

function FrequencyLabel({ pattern }: { pattern?: RecurrencePatternDto | null }) {
  if (!pattern) return <span className="text-muted-foreground text-sm">Jednorazowy</span>;

  const freqLabels: Record<string, string> = {
    daily: 'Dziennie',
    weekly: 'Tygodniowo',
    monthly: 'Miesięcznie',
  };

  const label = freqLabels[pattern.frequency] ?? pattern.frequency;
  const interval = pattern.interval > 1 ? ` (co ${pattern.interval})` : '';
  return (
    <Badge variant="secondary" className="text-xs">
      <RefreshCw className="mr-1 h-3 w-3" />
      {label}
      {interval}
    </Badge>
  );
}

export default function TaskTemplatesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { hasWritePermission, hasDeletePermission } = useModulePermissions('tasks');

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

  const { data: templatesResponse, isPending } = useTaskTemplates();
  const templates = templatesResponse?.data ?? [];

  const { data: assignees } = useTaskAssignees();
  const { data: clients } = useTaskClients();

  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();
  const createFromTemplate = useCreateTaskFromTemplate();

  const {
    createOpen,
    editing: editingTemplate,
    deleting: deletingTemplate,
    openCreate: openCreateDialog,
    closeCreate,
    startEditing,
    closeEditing,
    startDeleting,
    closeDeleting,
  } = useCrudDialogs<TaskTemplateResponseDto>();
  const dialogOpen = createOpen || !!editingTemplate;
  const [form, setForm] = useState<TemplateFormState>(emptyForm);

  const setField = <K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(emptyForm);
    openCreateDialog();
  };

  const openEdit = (template: TaskTemplateResponseDto) => {
    setForm(templateToForm(template));
    startEditing(template);
  };

  const closeDialog = () => {
    closeCreate();
    closeEditing();
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const dto = formToDto(form);
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, data: dto });
    } else {
      await createTemplate.mutateAsync(dto);
    }
    closeDialog();
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    await deleteTemplate.mutateAsync(deletingTemplate.id);
    closeDeleting();
  };

  const toggleDayOfWeek = (day: number) => {
    setField(
      'daysOfWeek',
      form.daysOfWeek.includes(day)
        ? form.daysOfWeek.filter((d) => d !== day)
        : [...form.daysOfWeek, day]
    );
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Szablony zadań"
        description="Twórz szablony wielokrotnego użytku i zadania cykliczne"
        icon={<LayoutTemplate className="h-6 w-6" />}
        action={
          hasWritePermission ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy szablon
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Szablony ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-12 w-full" />
              ))}
            </div>
          ) : templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Powtarzanie</TableHead>
                  <TableHead>Osoba</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Priorytet</TableHead>
                  <TableHead>Ostatnie</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell>
                      <FrequencyLabel
                        pattern={template.recurrencePattern as RecurrencePatternDto | null}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {template.assignee ? formatAssigneeName(template.assignee) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {template.client?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {template.priority ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {template.lastRecurrenceDate
                        ? format(new Date(template.lastRecurrenceDate), 'd MMM yyyy', {
                            locale: pl,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Utwórz zadanie z szablonu"
                          onClick={() => createFromTemplate.mutate(template.id)}
                          disabled={createFromTemplate.isPending}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {hasWritePermission && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasDeletePermission && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => startDeleting(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <LayoutTemplate className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Brak szablonów zadań</p>
              <p className="text-sm">Utwórz szablon, aby szybko tworzyć podobne zadania</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edytuj szablon' : 'Nowy szablon zadania'}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Zaktualizuj dane szablonu zadania'
                : 'Utwórz szablon do wielokrotnego użytku'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="tmpl-title">Tytuł *</Label>
              <Input
                id="tmpl-title"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Nazwa szablonu"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="tmpl-desc">Opis</Label>
              <Textarea
                id="tmpl-desc"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Opis zadania (opcjonalny)"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-1">
                <Label>Priorytet</Label>
                <Select
                  value={form.priority || 'none'}
                  onValueChange={(v) => setField('priority', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Brak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak</SelectItem>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated minutes */}
              <div className="space-y-1">
                <Label htmlFor="tmpl-est">Szacowany czas (min)</Label>
                <Input
                  id="tmpl-est"
                  type="number"
                  min={0}
                  value={form.estimatedMinutes}
                  onChange={(e) => setField('estimatedMinutes', e.target.value)}
                  placeholder="np. 60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <div className="space-y-1">
                <Label>Osoba odpowiedzialna</Label>
                <Select
                  value={form.assigneeId || 'none'}
                  onValueChange={(v) => setField('assigneeId', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Brak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak</SelectItem>
                    {assignees?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {`${a.firstName} ${a.lastName}`.trim() || a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client */}
              <div className="space-y-1">
                <Label>Klient</Label>
                <Select
                  value={form.clientId || 'none'}
                  onValueChange={(v) => setField('clientId', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Brak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence toggle */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="tmpl-recur"
                checked={form.hasRecurrence}
                onCheckedChange={(checked) => setField('hasRecurrence', !!checked)}
              />
              <Label htmlFor="tmpl-recur" className="cursor-pointer">
                Zadanie cykliczne
              </Label>
            </div>

            {form.hasRecurrence && (
              <div className="border-border space-y-4 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* Frequency */}
                  <div className="space-y-1">
                    <Label>Częstotliwość</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) =>
                        setField('frequency', v as 'daily' | 'weekly' | 'monthly')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Dziennie</SelectItem>
                        <SelectItem value="weekly">Tygodniowo</SelectItem>
                        <SelectItem value="monthly">Miesięcznie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Interval */}
                  <div className="space-y-1">
                    <Label htmlFor="tmpl-interval">
                      Co ile{' '}
                      {form.frequency === 'daily'
                        ? 'dni'
                        : form.frequency === 'weekly'
                          ? 'tygodni'
                          : 'miesięcy'}
                    </Label>
                    <Input
                      id="tmpl-interval"
                      type="number"
                      min={1}
                      max={99}
                      value={form.interval}
                      onChange={(e) => setField('interval', e.target.value)}
                    />
                  </div>
                </div>

                {/* Days of week (weekly only) */}
                {form.frequency === 'weekly' && (
                  <div className="space-y-1">
                    <Label>Dni tygodnia</Label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                            form.daysOfWeek.includes(d.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                          onClick={() => toggleDayOfWeek(d.value)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Day of month (monthly only) */}
                {form.frequency === 'monthly' && (
                  <div className="space-y-1">
                    <Label htmlFor="tmpl-dom">Dzień miesiąca</Label>
                    <Input
                      id="tmpl-dom"
                      type="number"
                      min={1}
                      max={28}
                      value={form.dayOfMonth}
                      onChange={(e) => setField('dayOfMonth', e.target.value)}
                    />
                  </div>
                )}

                {/* End date */}
                <div className="space-y-1">
                  <Label htmlFor="tmpl-end">Data zakończenia powtarzania (opcjonalnie)</Label>
                  <Input
                    id="tmpl-end"
                    type="date"
                    value={form.recurrenceEndDate}
                    onChange={(e) => setField('recurrenceEndDate', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || isSaving}>
              {editingTemplate ? 'Zapisz' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deletingTemplate && (
        <ConfirmDialog
          open={!!deletingTemplate}
          onOpenChange={(open) => !open && closeDeleting()}
          title="Usuń szablon"
          description={`Czy na pewno chcesz usunąć szablon "${deletingTemplate.title}"? Cykliczne zadania nie będą już tworzone.`}
          variant="destructive"
          onConfirm={handleDelete}
          isLoading={deleteTemplate.isPending}
        />
      )}
    </div>
  );
}
