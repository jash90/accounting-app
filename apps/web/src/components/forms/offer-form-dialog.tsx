import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDefaultOfferTemplate, useLeads, useOfferTemplates } from '@/lib/hooks/use-offers';
import {
  createOfferSchema,
  updateOfferSchema,
  type CreateOfferFormData,
  type UpdateOfferFormData,
} from '@/lib/validation/schemas';
import { type OfferResponseDto } from '@/types/dtos';

interface OfferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer?: OfferResponseDto;
  onSubmit: (data: CreateOfferFormData | UpdateOfferFormData) => void;
  preselectedLeadId?: string;
}

export function OfferFormDialog({
  open,
  onOpenChange,
  offer,
  onSubmit,
  preselectedLeadId,
}: OfferFormDialogProps) {
  const isEditing = !!offer;
  const schema = isEditing ? updateOfferSchema : createOfferSchema;

  const { data: leadsResponse } = useLeads({ limit: 100 }, { enabled: open });
  const leads = leadsResponse?.data ?? [];

  const { data: templatesResponse } = useOfferTemplates(
    { isActive: true, limit: 100 },
    { enabled: open }
  );
  const templates = useMemo(() => templatesResponse?.data ?? [], [templatesResponse?.data]);

  const { data: defaultTemplate } = useDefaultOfferTemplate({ enabled: open });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    offer?.templateId
  );

  const getDefaultValues = useCallback(
    (offerData?: OfferResponseDto): CreateOfferFormData | UpdateOfferFormData => {
      if (offerData) {
        return {
          title: offerData.title,
          description: offerData.description || '',
          leadId: offerData.leadId,
          clientId: offerData.clientId,
          templateId: offerData.templateId,
          vatRate: Number(offerData.vatRate),
          serviceTerms: offerData.serviceTerms
            ? {
                items: offerData.serviceTerms.items.map((item) => ({
                  name: item.name,
                  description: item.description,
                  unitPrice: Number(item.unitPrice),
                  quantity: Number(item.quantity),
                  unit: item.unit,
                })),
                paymentTermDays: offerData.serviceTerms.paymentTermDays,
                paymentMethod: offerData.serviceTerms.paymentMethod,
                additionalTerms: offerData.serviceTerms.additionalTerms,
              }
            : undefined,
          offerDate: offerData.offerDate ? new Date(offerData.offerDate) : new Date(),
          validUntil: offerData.validUntil ? new Date(offerData.validUntil) : undefined,
        };
      }
      return {
        title: '',
        description: '',
        leadId: preselectedLeadId,
        vatRate: 23,
        serviceTerms: {
          items: [{ name: '', description: '', unitPrice: 0, quantity: 1, unit: 'szt.' }],
          paymentTermDays: 14,
          paymentMethod: 'przelew',
        },
        offerDate: new Date(),
        validityDays: 30,
      };
    },
    [preselectedLeadId]
  );

  const form = useForm<CreateOfferFormData | UpdateOfferFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(offer),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'serviceTerms.items',
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Apply template defaults when selected
  useEffect(() => {
    if (selectedTemplate && !isEditing) {
      if (selectedTemplate.defaultServiceItems && selectedTemplate.defaultServiceItems.length > 0) {
        form.setValue(
          'serviceTerms.items',
          selectedTemplate.defaultServiceItems.map((item) => ({
            name: item.name,
            description: item.description,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            unit: item.unit,
          })),
          { shouldValidate: true }
        );
      }
      if (selectedTemplate.defaultVatRate != null) {
        form.setValue('vatRate', Number(selectedTemplate.defaultVatRate), { shouldValidate: true });
      }
      if (selectedTemplate.defaultValidityDays != null) {
        form.setValue('validityDays', Number(selectedTemplate.defaultValidityDays), {
          shouldValidate: true,
        });
      }
      // Load default values for custom placeholders (initialize ALL keys to avoid undefined)
      if (selectedTemplate.availablePlaceholders?.length) {
        const defaults: Record<string, string> = {};
        for (const ph of selectedTemplate.availablePlaceholders) {
          defaults[ph.key] = ph.defaultValue ?? '';
        }
        form.setValue('customPlaceholders', defaults);
      }
    }
  }, [selectedTemplate, form, isEditing]);

  // Set default template on first render - use callback to avoid
  // calling setState directly inside an effect (react-hooks/set-state-in-effect)
  useEffect(() => {
    if (defaultTemplate && !isEditing && !selectedTemplateId) {
      // Use startTransition-like pattern: batch via form update which triggers template defaults
      form.setValue('templateId', defaultTemplate.id, { shouldValidate: true });
      // Schedule state update as a microtask so it doesn't count as synchronous setState in effect
      queueMicrotask(() => setSelectedTemplateId(defaultTemplate.id));
    }
  }, [defaultTemplate, isEditing, selectedTemplateId, form]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        form.reset(getDefaultValues(offer));
        setSelectedTemplateId(offer?.templateId);
      } else {
        form.reset(getDefaultValues(undefined));
        setSelectedTemplateId(undefined);
      }
      onOpenChange(newOpen);
    },
    [offer, form, getDefaultValues, onOpenChange]
  );

  const handleSubmit = (data: CreateOfferFormData | UpdateOfferFormData) => {
    // Filter out empty/undefined custom placeholder values
    let filteredPlaceholders: Record<string, string> | undefined;
    if (data.customPlaceholders) {
      const entries = Object.entries(data.customPlaceholders).filter(
        ([, v]) => typeof v === 'string' && v.trim() !== ''
      );
      filteredPlaceholders = entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }

    onSubmit({
      ...data,
      description: data.description || undefined,
      customPlaceholders: filteredPlaceholders,
    } as CreateOfferFormData | UpdateOfferFormData);
  };

  const watchedItems = useWatch({ control: form.control, name: 'serviceTerms.items' });

  const calculatedTotal = useMemo(() => {
    const items = watchedItems || [];
    const total = items.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0),
      0
    );
    return Math.round(total * 100) / 100;
  }, [watchedItems]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj ofertę' : 'Nowa oferta'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Dane podstawowe</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Tytuł oferty *</FormLabel>
                        <FormControl>
                          <Input placeholder="Oferta na usługi księgowe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prospekt *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz prospekt" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                {lead.name}
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
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Szablon</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedTemplateId(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz szablon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} {template.isDefault && '(domyślny)'}
                              </SelectItem>
                            ))}
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
                      <FormLabel>Opis</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowy opis oferty..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Template Placeholder Fields */}
              {selectedTemplate?.availablePlaceholders &&
                selectedTemplate.availablePlaceholders.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-foreground text-sm font-semibold">Pola szablonu</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTemplate.availablePlaceholders.map((ph) => (
                        <FormField
                          key={ph.key}
                          control={form.control}
                          name={`customPlaceholders.${ph.key}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{ph.label}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={ph.description || ph.label}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Service Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground text-sm font-semibold">Pozycje usług</h3>
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
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`serviceTerms.items.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa usługi *</FormLabel>
                              <FormControl>
                                <Input placeholder="Prowadzenie księgowości" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`serviceTerms.items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cena jedn.</FormLabel>
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
                          name={`serviceTerms.items.${index}.quantity`}
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
                          name={`serviceTerms.items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jednostka</FormLabel>
                              <FormControl>
                                <Input placeholder="szt." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <FormField
                        control={form.control}
                        name={`serviceTerms.items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Opis usługi (opcjonalnie)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <div className="text-lg font-semibold">
                    Razem netto: {calculatedTotal.toFixed(2)} PLN
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Warunki płatności</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="vatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stawka VAT (%)</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="serviceTerms.paymentTermDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termin płatności (dni)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 14)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceTerms.paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metoda płatności</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz metodę" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="przelew">Przelew bankowy</SelectItem>
                            <SelectItem value="gotówka">Gotówka</SelectItem>
                            <SelectItem value="karta">Karta płatnicza</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serviceTerms.additionalTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dodatkowe warunki</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe warunki umowy..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Daty</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="offerDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data oferty</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : undefined
                            }
                            onChange={(value) => {
                              if (!value) {
                                field.onChange(undefined);
                                return;
                              }
                              const [year, month, day] = value.split('-').map(Number);
                              field.onChange(new Date(year, month - 1, day));
                            }}
                            placeholder="Wybierz datę"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isEditing && (
                    <FormField
                      control={form.control}
                      name="validityDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ważność (dni)</FormLabel>
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
                  )}

                  {isEditing && (
                    <FormField
                      control={form.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ważna do</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split('T')[0]
                                  : undefined
                              }
                              onChange={(value) => {
                                if (!value) {
                                  field.onChange(undefined);
                                  return;
                                }
                                const [year, month, day] = value.split('-').map(Number);
                                field.onChange(new Date(year, month - 1, day));
                              }}
                              placeholder="Wybierz datę"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isEditing ? 'Zapisz zmiany' : 'Utwórz ofertę'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
