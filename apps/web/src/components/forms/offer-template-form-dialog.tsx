import { useCallback } from 'react';

import { useFieldArray, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createOfferTemplateSchema,
  updateOfferTemplateSchema,
  type CreateOfferTemplateFormData,
  type UpdateOfferTemplateFormData,
} from '@/lib/validation/schemas';
import { type OfferTemplateResponseDto } from '@/types/dtos';

interface OfferTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: OfferTemplateResponseDto;
  onSubmit: (data: CreateOfferTemplateFormData | UpdateOfferTemplateFormData) => void;
}

export function OfferTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: OfferTemplateFormDialogProps) {
  const isEditing = !!template;
  const schema = isEditing ? updateOfferTemplateSchema : createOfferTemplateSchema;

  const getDefaultValues = useCallback(
    (
      templateData?: OfferTemplateResponseDto
    ): CreateOfferTemplateFormData | UpdateOfferTemplateFormData => {
      if (templateData) {
        return {
          name: templateData.name,
          description: templateData.description || '',
          defaultServiceItems: templateData.defaultServiceItems || [],
          defaultValidityDays: templateData.defaultValidityDays,
          defaultVatRate: templateData.defaultVatRate,
          isDefault: templateData.isDefault,
          isActive: templateData.isActive,
        };
      }
      return {
        name: '',
        description: '',
        defaultServiceItems: [
          {
            name: 'Prowadzenie księgi przychodów i rozchodów',
            unitPrice: 300,
            quantity: 1,
            unit: 'mies.',
          },
          { name: 'Obsługa kadrowo-płacowa', unitPrice: 150, quantity: 1, unit: 'mies.' },
        ],
        defaultValidityDays: 30,
        defaultVatRate: 23,
        isDefault: false,
      };
    },
    []
  );

  const form = useForm<CreateOfferTemplateFormData | UpdateOfferTemplateFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(template),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'defaultServiceItems',
  });

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        form.reset(getDefaultValues(template));
      } else {
        form.reset(getDefaultValues(undefined));
      }
      onOpenChange(newOpen);
    },
    [template, form, getDefaultValues, onOpenChange]
  );

  const handleSubmit = (data: CreateOfferTemplateFormData | UpdateOfferTemplateFormData) => {
    const cleanedData = {
      ...data,
      description: data.description || undefined,
    };
    onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj szablon' : 'Nowy szablon oferty'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Dane podstawowe</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa szablonu *</FormLabel>
                      <FormControl>
                        <Input placeholder="Szablon standardowy" {...field} />
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
                        <Textarea
                          placeholder="Opis szablonu..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Szablon domyślny</FormLabel>
                          <p className="text-muted-foreground text-sm">
                            Użyj jako domyślny dla nowych ofert
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Aktywny</FormLabel>
                            <p className="text-muted-foreground text-sm">
                              Szablon jest dostępny do użycia
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? true}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Default Settings */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Ustawienia domyślne</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultValidityDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domyślna ważność (dni)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultVatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domyślna stawka VAT (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 23)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Default Service Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-apptax-navy text-sm font-semibold">Domyślne pozycje usług</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ name: '', description: '', unitPrice: 0, quantity: 1, unit: 'szt.' })
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Dodaj pozycję
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`defaultServiceItems.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa usługi</FormLabel>
                              <FormControl>
                                <Input placeholder="Nazwa usługi" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`defaultServiceItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cena</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`defaultServiceItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ilość</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0.01}
                                  step={0.01}
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`defaultServiceItems.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jedn.</FormLabel>
                              <FormControl>
                                <Input placeholder="szt." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                  <p className="text-muted-foreground text-center text-sm">
                    Brak domyślnych pozycji. Kliknij &quot;Dodaj pozycję&quot; aby dodać.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-apptax-blue hover:bg-apptax-blue/90"
                >
                  {isEditing ? 'Zapisz zmiany' : 'Utwórz szablon'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
