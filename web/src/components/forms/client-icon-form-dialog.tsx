import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import {
  createClientIconSchema,
  updateClientIconSchema,
  CreateClientIconFormData,
  UpdateClientIconFormData,
} from '@/lib/validation/schemas';
import { ClientIconResponseDto } from '@/types/dtos';
import { IconType, AutoAssignCondition } from '@/types/enums';
import { IconSelector } from '@/components/clients/icon-selector';
import { AutoAssignConditionBuilder } from '@/components/clients/auto-assign-condition-builder';

interface ClientIconFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ClientIconResponseDto;
  onSubmit: (data: CreateClientIconFormData | UpdateClientIconFormData) => void;
}

export function ClientIconFormDialog({
  open,
  onOpenChange,
  icon,
  onSubmit,
}: ClientIconFormDialogProps) {
  const isEditing = !!icon;
  const schema = isEditing ? updateClientIconSchema : createClientIconSchema;

  // Separate state for autoAssignCondition (managed outside react-hook-form for simplicity)
  const [autoAssignCondition, setAutoAssignCondition] = useState<AutoAssignCondition | undefined>(
    icon?.autoAssignCondition || undefined
  );

  const form = useForm<CreateClientIconFormData | UpdateClientIconFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: icon
      ? {
          name: icon.name,
          color: icon.color || '',
          iconType: icon.iconType as 'lucide' | 'custom' | 'emoji',
          iconValue: icon.iconValue || '',
        }
      : {
          name: '',
          color: '',
          iconType: IconType.LUCIDE as 'lucide' | 'custom' | 'emoji',
          iconValue: '',
        },
  });

  // Reset form when dialog opens/closes or icon changes
  useEffect(() => {
    if (open) {
      form.reset(
        icon
          ? {
              name: icon.name,
              color: icon.color || '',
              iconType: icon.iconType as 'lucide' | 'custom' | 'emoji',
              iconValue: icon.iconValue || '',
            }
          : {
              name: '',
              color: '',
              iconType: IconType.LUCIDE as 'lucide' | 'custom' | 'emoji',
              iconValue: '',
            }
      );
      // Reset autoAssignCondition state
      setAutoAssignCondition(icon?.autoAssignCondition || undefined);
    }
  }, [open, icon, form]);

  const handleSubmit = (data: CreateClientIconFormData | UpdateClientIconFormData) => {
    // Clean up empty color values
    const submitData = { ...data };
    if (!submitData.color) {
      delete submitData.color;
    }
    // Include autoAssignCondition
    if (autoAssignCondition) {
      submitData.autoAssignCondition = autoAssignCondition;
    } else if (isEditing && icon?.autoAssignCondition) {
      // Explicitly set to null to remove existing condition when editing
      submitData.autoAssignCondition = null;
    }
    onSubmit(submitData);
    form.reset();
    setAutoAssignCondition(undefined);
  };

  const iconType = form.watch('iconType') as IconType;
  const iconValue = form.watch('iconValue');
  const color = form.watch('color');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj ikonę' : 'Dodaj ikonę'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa ikony *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. VAT, ZUS, Ważne" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Ikona *</FormLabel>
              <IconSelector
                value={{
                  iconType: iconType || IconType.LUCIDE,
                  iconValue: iconValue,
                  color: color,
                  file: form.getValues('file' as any),
                }}
                onChange={(value) => {
                  form.setValue('iconType', value.iconType as 'lucide' | 'custom' | 'emoji');
                  form.setValue('iconValue', value.iconValue || '');
                  if (value.color !== undefined) {
                    form.setValue('color', value.color || '');
                  }
                  if (value.file) {
                    form.setValue('file' as any, value.file);
                  }
                }}
              />
              <FormMessage>
                {form.formState.errors.iconValue?.message}
              </FormMessage>
            </FormItem>

            <AutoAssignConditionBuilder
              value={autoAssignCondition}
              onChange={setAutoAssignCondition}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                {isEditing ? 'Zapisz' : 'Dodaj'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
