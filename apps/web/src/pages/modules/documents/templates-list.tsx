import { useState } from 'react';

import { useForm } from 'react-hook-form';

import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { type DocumentTemplateDto } from '@/lib/api/endpoints/documents';
import {
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocumentTemplates,
  useUpdateDocumentTemplate,
} from '@/lib/hooks/use-documents';

const CATEGORIES = [
  { value: 'offer', label: 'Oferta' },
  { value: 'contract', label: 'Umowa' },
  { value: 'invoice', label: 'Faktura' },
  { value: 'report', label: 'Raport' },
  { value: 'other', label: 'Inne' },
];

interface TemplateFormData {
  name: string;
  description: string;
  templateContent: string;
  placeholders: string;
  category: string;
  isActive: boolean;
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: DocumentTemplateDto | null;
}) {
  const createMutation = useCreateDocumentTemplate();
  const updateMutation = useUpdateDocumentTemplate();

  const form = useForm<TemplateFormData>({
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      templateContent: template?.templateContent ?? '',
      placeholders: template?.placeholders?.join(', ') ?? '',
      category: template?.category ?? 'other',
      isActive: template?.isActive ?? true,
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    const placeholderList = data.placeholders
      ? data.placeholders
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: data.name,
      description: data.description || undefined,
      templateContent: data.templateContent || undefined,
      placeholders: placeholderList.length > 0 ? placeholderList : undefined,
      category: data.category as DocumentTemplateDto['category'],
      isActive: data.isActive,
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edytuj szablon dokumentu' : 'Nowy szablon dokumentu'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Nazwa jest wymagana' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa szablonu</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Umowa o świadczenie usług" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Aktywny</FormLabel>
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
              name="placeholders"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholdery (oddzielone przecinkami)</FormLabel>
                  <FormControl>
                    <Input placeholder="np. klient_nazwa, data_umowy, kwota" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treść szablonu (Handlebars)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        'Użyj składni {{placeholder}} dla zmiennych.\n\nPrzykład:\nSzanowny {{klient_nazwa}},\n\nNiniejsza umowa zawarta w dniu {{data_umowy}}...'
                      }
                      rows={10}
                      className="font-mono text-sm"
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

export default function DocumentsTemplatesListPage() {
  const { data: templates, isLoading } = useDocumentTemplates();
  const deleteTemplate = useDeleteDocumentTemplate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateDto | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Szablon usunięty');
    } catch {
      toast.error('Błąd podczas usuwania szablonu');
    }
  };

  const handleEdit = (template: DocumentTemplateDto) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingTemplate(null);
  };

  if (isLoading) return <div className="p-6">Ładowanie...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Szablony dokumentów</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy szablon
        </Button>
      </div>

      {templates?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak szablonów dokumentów. Dodaj pierwszy szablon.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <div className="flex gap-2">
                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                  {template.isActive ? 'Aktywny' : 'Nieaktywny'}
                </Badge>
                <Badge variant="outline">
                  {CATEGORIES.find((c) => c.value === template.category)?.label ??
                    template.category}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {(template.description || template.placeholders?.length) && (
              <CardContent className="space-y-2">
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                {template.placeholders && template.placeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.placeholders.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs font-mono">
                        {`{{${p}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
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
