import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  createModuleSchema,
  updateModuleSchema,
  type CreateModuleFormData,
  type UpdateModuleFormData,
} from '@/lib/validation/schemas';
import { type ModuleDto } from '@/types/dtos';

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: ModuleDto;
  onSubmit: (data: CreateModuleFormData | UpdateModuleFormData) => void;
}

export function ModuleFormDialog({ open, onOpenChange, module, onSubmit }: ModuleFormDialogProps) {
  const isEditing = !!module;
  const schema = isEditing ? updateModuleSchema : createModuleSchema;

  const form = useForm<CreateModuleFormData | UpdateModuleFormData>({
    resolver: zodResolver(schema),
    defaultValues: module
      ? { name: module.name, slug: module.slug, description: module.description }
      : { name: '', slug: '', description: '' },
  });

  const handleSubmit = (data: CreateModuleFormData | UpdateModuleFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj moduł' : 'Utwórz moduł'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa modułu</FormLabel>
                  <FormControl>
                    <Input placeholder="Agent AI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identyfikator (slug)</FormLabel>
                  <FormControl>
                    <Input placeholder="ai-agent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Input placeholder="Agent AI do czatu, RAG i automatyzacji" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Zapisz' : 'Utwórz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
