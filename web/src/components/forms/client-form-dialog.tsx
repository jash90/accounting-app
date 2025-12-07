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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createClientSchema,
  updateClientSchema,
  CreateClientFormData,
  UpdateClientFormData,
} from '@/lib/validation/schemas';
import { ClientResponseDto } from '@/types/dtos';
import { EmploymentType, VatStatus, TaxScheme, ZusStatus } from '@/types/enums';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientResponseDto;
  onSubmit: (data: CreateClientFormData | UpdateClientFormData) => void;
}

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'DG',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 etatu poniżej min.',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 etatu powyżej min.',
};

const VAT_STATUS_LABELS: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT miesięczny',
  [VatStatus.VAT_QUARTERLY]: 'VAT kwartalny',
  [VatStatus.NO]: 'Nie',
  [VatStatus.NO_WATCH_LIMIT]: 'Nie (obserwuj limit)',
};

const TAX_SCHEME_LABELS: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Zasady ogólne',
};

const ZUS_STATUS_LABELS: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny',
  [ZusStatus.PREFERENTIAL]: 'Preferencyjny',
  [ZusStatus.NONE]: 'Brak',
};

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: ClientFormDialogProps) {
  const isEditing = !!client;
  const schema = isEditing ? updateClientSchema : createClientSchema;

  const form = useForm<CreateClientFormData | UpdateClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: client
      ? {
          name: client.name,
          nip: client.nip || '',
          email: client.email || '',
          phone: client.phone || '',
          companyStartDate: client.companyStartDate
            ? new Date(client.companyStartDate)
            : undefined,
          cooperationStartDate: client.cooperationStartDate
            ? new Date(client.cooperationStartDate)
            : undefined,
          suspensionDate: client.suspensionDate
            ? new Date(client.suspensionDate)
            : undefined,
          companySpecificity: client.companySpecificity || '',
          additionalInfo: client.additionalInfo || '',
          gtuCode: client.gtuCode || '',
          amlGroup: client.amlGroup || '',
          employmentType: client.employmentType,
          vatStatus: client.vatStatus,
          taxScheme: client.taxScheme,
          zusStatus: client.zusStatus,
        }
      : {
          name: '',
          nip: '',
          email: '',
          phone: '',
          companySpecificity: '',
          additionalInfo: '',
          gtuCode: '',
          amlGroup: '',
        },
  });

  const handleSubmit = (data: CreateClientFormData | UpdateClientFormData) => {
    // Clean up empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    );
    onSubmit(cleanedData as CreateClientFormData | UpdateClientFormData);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj klienta' : 'Dodaj klienta'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Dane podstawowe
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nazwa klienta *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nazwa firmy lub imię i nazwisko" {...field} />
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            {...field}
                          />
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

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">Daty</h3>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="companyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data rozpoczęcia firmy</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
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
                    name="cooperationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data rozpoczęcia współpracy</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
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
                    name="suspensionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data zawieszenia</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tax and Employment */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Podatki i zatrudnienie
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma zatrudnienia</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status VAT</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(VAT_STATUS_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxScheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma opodatkowania</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TAX_SCHEME_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zusStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status ZUS</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ZUS_STATUS_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Dodatkowe informacje
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gtuCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kod GTU</FormLabel>
                        <FormControl>
                          <Input placeholder="np. GTU_01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amlGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupa AML</FormLabel>
                        <FormControl>
                          <Input placeholder="Grupa ryzyka" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companySpecificity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specyfika firmy</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Opisz specyfikę działalności..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dodatkowe informacje</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe uwagi..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  {isEditing ? 'Zapisz zmiany' : 'Dodaj klienta'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
