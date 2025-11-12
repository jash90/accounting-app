import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
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
import { Button } from '@/components/ui/button';
import { createSimpleTextSchema, updateSimpleTextSchema, CreateSimpleTextFormData, UpdateSimpleTextFormData } from '@/lib/validation/schemas';
import { SimpleTextResponseDto } from '@/types/dtos';

interface SimpleTextFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text?: SimpleTextResponseDto;
  onSubmit: (data: CreateSimpleTextFormData | UpdateSimpleTextFormData) => void;
}

export function SimpleTextFormDialog({ open, onOpenChange, text, onSubmit }: SimpleTextFormDialogProps) {
  const isEditing = !!text;
  const schema = isEditing ? updateSimpleTextSchema : createSimpleTextSchema;

  const form = useForm<CreateSimpleTextFormData | UpdateSimpleTextFormData>({
    resolver: zodResolver(schema),
    defaultValues: text || {
      content: '',
    },
  });

  const handleSubmit = (data: CreateSimpleTextFormData | UpdateSimpleTextFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Text' : 'Create Text'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y"
                      placeholder="Enter text content..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

