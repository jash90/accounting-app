import { useState, useEffect } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  createClientFieldDefinitionSchema,
  updateClientFieldDefinitionSchema,
  type CreateClientFieldDefinitionFormData,
  type UpdateClientFieldDefinitionFormData,
} from '@/lib/validation/schemas';
import { type ClientFieldDefinitionResponseDto } from '@/types/dtos';
import { CustomFieldType } from '@/types/enums';

interface FieldDefinitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldDefinition?: ClientFieldDefinitionResponseDto;
  onSubmit: (
    data: CreateClientFieldDefinitionFormData | UpdateClientFieldDefinitionFormData
  ) => void;
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};

export function FieldDefinitionFormDialog({
  open,
  onOpenChange,
  fieldDefinition,
  onSubmit,
}: FieldDefinitionFormDialogProps) {
  const isEditing = !!fieldDefinition;
  const schema = isEditing ? updateClientFieldDefinitionSchema : createClientFieldDefinitionSchema;

  const [enumValue, setEnumValue] = useState('');

  const form = useForm<CreateClientFieldDefinitionFormData | UpdateClientFieldDefinitionFormData>({
    resolver: zodResolver(schema),
    defaultValues: fieldDefinition
      ? {
          name: fieldDefinition.name,
          label: fieldDefinition.label,
          fieldType: fieldDefinition.fieldType,
          isRequired: fieldDefinition.isRequired,
          enumValues: fieldDefinition.enumValues || [],
          displayOrder: fieldDefinition.displayOrder,
        }
      : {
          name: '',
          label: '',
          fieldType: undefined,
          isRequired: false,
          enumValues: [],
          displayOrder: 0,
        },
  });

  // Reset form when dialog opens or fieldDefinition changes
  useEffect(() => {
    if (open) {
      form.reset(
        fieldDefinition
          ? {
              name: fieldDefinition.name,
              label: fieldDefinition.label,
              fieldType: fieldDefinition.fieldType,
              isRequired: fieldDefinition.isRequired,
              enumValues: fieldDefinition.enumValues || [],
              displayOrder: fieldDefinition.displayOrder,
            }
          : {
              name: '',
              label: '',
              fieldType: undefined,
              isRequired: false,
              enumValues: [],
              displayOrder: 0,
            }
      );
      setEnumValue('');
    }
  }, [open, fieldDefinition, form]);

  const fieldType = form.watch('fieldType');
  const enumValues = form.watch('enumValues') || [];

  const handleAddEnumValue = () => {
    if (enumValue.trim() && !enumValues.includes(enumValue.trim())) {
      form.setValue('enumValues', [...enumValues, enumValue.trim()]);
      setEnumValue('');
    }
  };

  const handleRemoveEnumValue = (value: string) => {
    form.setValue(
      'enumValues',
      enumValues.filter((v) => v !== value)
    );
  };

  const handleSubmit = (
    data: CreateClientFieldDefinitionFormData | UpdateClientFieldDefinitionFormData
  ) => {
    // Only include enumValues for ENUM field type
    const submitData = { ...data };
    if (submitData.fieldType !== CustomFieldType.ENUM) {
      delete submitData.enumValues;
    }
    onSubmit(submitData);
    // Don't reset here - let the parent component control the dialog state
    // The form will reset when the dialog closes and reopens due to defaultValues
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj definicję pola' : 'Dodaj definicję pola'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa systemowa *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. custom_field_1" {...field} disabled={isEditing} />
                  </FormControl>
                  <FormDescription>
                    Unikalna nazwa pola (bez spacji, tylko litery i podkreślenia)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etykieta *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nazwa wyświetlana użytkownikowi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ pola *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz typ..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
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

            {fieldType === CustomFieldType.ENUM && (
              <FormItem>
                <FormLabel>Wartości listy wyboru</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Dodaj wartość..."
                    value={enumValue}
                    onChange={(e) => setEnumValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEnumValue();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddEnumValue} variant="secondary">
                    Dodaj
                  </Button>
                </div>
                {enumValues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {enumValues.map((value) => (
                      <Badge key={value} variant="secondary" className="gap-1">
                        {value}
                        <button
                          type="button"
                          onClick={() => handleRemoveEnumValue(value)}
                          className="hover:text-destructive ml-1"
                          aria-label={`Usuń wartość ${value}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Pole wymagane</FormLabel>
                    <FormDescription>Użytkownik będzie musiał wypełnić to pole</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolejność wyświetlania</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Mniejsza liczba = wyświetlane wcześniej</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
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
