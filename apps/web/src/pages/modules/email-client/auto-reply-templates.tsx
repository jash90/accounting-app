import { useForm } from 'react-hook-form';

import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import {
  type AutoReplyTemplate,
  useAutoReplyTemplates,
  useCreateAutoReplyTemplate,
  useDeleteAutoReplyTemplate,
  useToggleAutoReplyTemplate,
  useUpdateAutoReplyTemplate,
} from '@/lib/hooks/use-auto-reply-templates';
import { useCrudDialogs } from '@/lib/hooks/use-crud-dialogs';
import { formatDate } from '@/lib/utils/format-date';

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  triggerKeywords: string;
  keywordMatchMode: 'any' | 'all';
  matchSubjectOnly: boolean;
  bodyTemplate: string;
  tone: 'formal' | 'casual' | 'neutral';
  customInstructions: string;
}

const TEMPLATE_CATEGORIES = ['CEIDG', 'VAT', 'ZUS', 'PIT', 'Ogólne'];

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: AutoReplyTemplate | null;
}) {
  const createMutation = useCreateAutoReplyTemplate();
  const updateMutation = useUpdateAutoReplyTemplate();

  const form = useForm<TemplateFormData>({
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      category: template?.category ?? '',
      isActive: template?.isActive ?? true,
      triggerKeywords: template?.triggerKeywords.join(', ') ?? '',
      keywordMatchMode: (template?.keywordMatchMode as 'any' | 'all') ?? 'any',
      matchSubjectOnly: template?.matchSubjectOnly ?? false,
      bodyTemplate: template?.bodyTemplate ?? '',
      tone: (template?.tone as 'formal' | 'casual' | 'neutral') ?? 'formal',
      customInstructions: template?.customInstructions ?? '',
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      category: data.category && data.category !== '__none__' ? data.category : undefined,
      isActive: data.isActive,
      triggerKeywords: data.triggerKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      keywordMatchMode: data.keywordMatchMode,
      matchSubjectOnly: data.matchSubjectOnly,
      bodyTemplate: data.bodyTemplate,
      tone: data.tone,
      customInstructions: data.customInstructions || undefined,
    };

    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, data: payload });
        toast.success('Szablon zaktualizowany');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Szablon utworzony');
      }
      onOpenChange(false);
    } catch {
      toast.error('Błąd podczas zapisywania szablonu');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edytuj szablon' : 'Nowy szablon auto-odpowiedzi'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Nazwa jest wymagana' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Odpowiedź VAT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || '__none__'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kategorię" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Brak</SelectItem>
                        {TEMPLATE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ton odpowiedzi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formal">Formalny</SelectItem>
                        <SelectItem value="casual">Swobodny</SelectItem>
                        <SelectItem value="neutral">Neutralny</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis (opcjonalny)</FormLabel>
                  <FormControl>
                    <Input placeholder="Krótki opis szablonu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerKeywords"
              rules={{ required: 'Słowa kluczowe są wymagane' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Słowa kluczowe (oddzielone przecinkami)</FormLabel>
                  <FormControl>
                    <Input placeholder="np. faktura VAT, rozliczenie VAT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="keywordMatchMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tryb dopasowania</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Dowolne słowo</SelectItem>
                        <SelectItem value="all">Wszystkie słowa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 pt-1">
                <FormField
                  control={form.control}
                  name="matchSubjectOnly"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 pt-6">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Tylko w temacie</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Aktywny</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="bodyTemplate"
              rules={{ required: 'Treść szablonu jest wymagana' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treść szablonu odpowiedzi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={'Szanowny Kliencie,\n\nDziękujemy za wiadomość...'}
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrukcje dla AI (opcjonalne)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe instrukcje jak AI powinno wygenerować odpowiedź..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Zapisywanie...' : template ? 'Zapisz zmiany' : 'Utwórz szablon'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AutoReplyTemplatesPage() {
  const { data: templates, isLoading } = useAutoReplyTemplates();
  const deleteTemplate = useDeleteAutoReplyTemplate();
  const toggleTemplate = useToggleAutoReplyTemplate();
  const {
    createOpen,
    editing: editingTemplate,
    openCreate: handleCreate,
    closeCreate,
    startEditing,
    closeEditing,
  } = useCrudDialogs<AutoReplyTemplate>();
  const formOpen = createOpen || !!editingTemplate;

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Szablon usunięty');
    } catch {
      toast.error('Błąd podczas usuwania szablonu');
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    const label = currentState ? 'dezaktywowany' : 'aktywowany';
    try {
      await toggleTemplate.mutateAsync({ id, isActive: !currentState });
      toast.success(`Szablon ${label}`);
    } catch {
      toast.error('Błąd podczas zmiany stanu szablonu');
    }
  };

  const handleEdit = (template: AutoReplyTemplate) => {
    startEditing(template);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      closeCreate();
      closeEditing();
    }
  };

  if (isLoading) return <div className="p-6">Ładowanie...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Szablony auto-odpowiedzi</h1>
          <p className="text-muted-foreground">
            Automatyczne odpowiedzi na emaile na podstawie słów kluczowych
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy szablon
        </Button>
      </div>

      {templates?.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">
            Brak szablonów auto-odpowiedzi. Dodaj pierwszy szablon.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                  {template.isActive ? 'Aktywny' : 'Nieaktywny'}
                </Badge>
                {template.category && <Badge variant="secondary">{template.category}</Badge>}
                <Badge variant="outline">{template.tone}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(template.id, template.isActive)}
                >
                  {template.isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.description && (
                <p className="text-muted-foreground text-sm">{template.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {template.triggerKeywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
              <div className="text-muted-foreground flex gap-4 text-xs">
                <span>
                  Tryb: {template.keywordMatchMode === 'any' ? 'dowolne słowo' : 'wszystkie słowa'}
                </span>
                <span>Dopasowania: {template.matchCount}</span>
                {template.lastMatchedAt && (
                  <span>
                    Ostatnie: {formatDate(template.lastMatchedAt)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TemplateFormDialog
        key={editingTemplate?.id ?? 'new'}
        open={formOpen}
        onOpenChange={handleFormClose}
        template={editingTemplate}
      />
    </div>
  );
}
