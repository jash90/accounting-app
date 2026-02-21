import { useCallback } from 'react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLeadAssignees } from '@/lib/hooks/use-offers';
import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadFormData,
  type UpdateLeadFormData,
} from '@/lib/validation/schemas';
import { type LeadResponseDto } from '@/types/dtos';
import { LeadSource, LeadSourceLabels, LeadStatus, LeadStatusLabels } from '@/types/enums';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadResponseDto;
  onSubmit: (data: CreateLeadFormData | UpdateLeadFormData) => void;
}

export function LeadFormDialog({ open, onOpenChange, lead, onSubmit }: LeadFormDialogProps) {
  const isEditing = !!lead;
  const schema = isEditing ? updateLeadSchema : createLeadSchema;

  const { data: assignees } = useLeadAssignees();

  const getDefaultValues = useCallback(
    (leadData?: LeadResponseDto): CreateLeadFormData | UpdateLeadFormData => {
      if (leadData) {
        return {
          name: leadData.name,
          nip: leadData.nip || '',
          regon: leadData.regon || '',
          street: leadData.street || '',
          postalCode: leadData.postalCode || '',
          city: leadData.city || '',
          country: leadData.country || 'Polska',
          contactPerson: leadData.contactPerson || '',
          contactPosition: leadData.contactPosition || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          source: leadData.source,
          notes: leadData.notes || '',
          estimatedValue: leadData.estimatedValue,
          assignedToId: leadData.assignedToId,
          status: leadData.status,
        };
      }
      return {
        name: '',
        nip: '',
        regon: '',
        street: '',
        postalCode: '',
        city: '',
        country: 'Polska',
        contactPerson: '',
        contactPosition: '',
        email: '',
        phone: '',
        notes: '',
      };
    },
    []
  );

  const form = useForm<CreateLeadFormData | UpdateLeadFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(lead),
  });

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        form.reset(getDefaultValues(lead));
      } else {
        form.reset(getDefaultValues(undefined));
      }
      onOpenChange(newOpen);
    },
    [lead, form, getDefaultValues, onOpenChange]
  );

  const handleSubmit = (data: CreateLeadFormData | UpdateLeadFormData) => {
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
    );
    onSubmit(cleanedData as CreateLeadFormData | UpdateLeadFormData);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj prospekt' : 'Dodaj prospekt'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Dane firmy</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nazwa firmy *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nazwa firmy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="regon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>REGON</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Adres</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Ulica</FormLabel>
                        <FormControl>
                          <Input placeholder="ul. Przykładowa 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kod pocztowy</FormLabel>
                        <FormControl>
                          <Input placeholder="00-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miasto</FormLabel>
                        <FormControl>
                          <Input placeholder="Warszawa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kraj</FormLabel>
                        <FormControl>
                          <Input placeholder="Polska" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Kontakt</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Osoba kontaktowa</FormLabel>
                        <FormControl>
                          <Input placeholder="Jan Kowalski" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stanowisko</FormLabel>
                        <FormControl>
                          <Input placeholder="Dyrektor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="+48 123 456 789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="text-apptax-navy text-sm font-semibold">Szczegóły prospektu</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Źródło</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz źródło" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(LeadSource).map((source) => (
                              <SelectItem key={source} value={source}>
                                {LeadSourceLabels[source]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(LeadStatus).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {LeadStatusLabels[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="estimatedValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Szacowana wartość</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
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
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Przypisany do</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz osobę" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assignees?.map((assignee) => (
                              <SelectItem key={assignee.id} value={assignee.id}>
                                {assignee.firstName} {assignee.lastName}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notatki</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe informacje..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {isEditing ? 'Zapisz zmiany' : 'Dodaj prospekt'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
