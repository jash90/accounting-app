import { useEffect } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCreateClientEmployee, useUpdateClientEmployee } from '@/lib/hooks/use-clients';
import {
  type ClientEmployeeResponseDto,
  type CreateClientEmployeeDto,
  type UpdateClientEmployeeDto,
} from '@/types/dtos';
import {
  EmployeeContractType,
  EmployeeContractTypeLabels,
  WorkplaceType,
  WorkplaceTypeLabels,
} from '@/types/enums';

// Helper to convert grosze to PLN for display
const groszeToPln = (grosze: number | undefined | null): string => {
  if (grosze === undefined || grosze === null) return '';
  return (grosze / 100).toFixed(2);
};

// Helper to convert PLN to grosze for storage
const plnToGrosze = (pln: string | undefined): number | undefined => {
  if (!pln || pln.trim() === '') return undefined;
  const parsed = parseFloat(pln.replace(',', '.'));
  return isNaN(parsed) ? undefined : Math.round(parsed * 100);
};

const formSchema = z.object({
  firstName: z.string().min(1, 'Imię jest wymagane').max(100),
  lastName: z.string().min(1, 'Nazwisko jest wymagane').max(100),
  pesel: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{11}$/.test(val), 'PESEL musi składać się z 11 cyfr'),
  email: z.string().email('Nieprawidłowy email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  contractType: z.nativeEnum(EmployeeContractType),
  position: z.string().max(255).optional(),
  startDate: z.string().min(1, 'Data rozpoczęcia jest wymagana'),
  endDate: z.string().optional(),
  grossSalaryPln: z.string().optional(),
  // UMOWA_O_PRACE fields
  workingHoursPerWeek: z.string().optional(),
  vacationDaysPerYear: z.string().optional(),
  workplaceType: z.nativeEnum(WorkplaceType).optional().nullable(),
  // UMOWA_ZLECENIE fields
  hourlyRatePln: z.string().optional(),
  isStudent: z.boolean().optional(),
  hasOtherInsurance: z.boolean().optional(),
  // UMOWA_O_DZIELO fields
  projectDescription: z.string().optional(),
  deliveryDate: z.string().optional(),
  agreedAmountPln: z.string().optional(),
  // Common
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientEmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  employee?: ClientEmployeeResponseDto;
}

export function ClientEmployeeFormDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  employee,
}: ClientEmployeeFormDialogProps) {
  const isEditing = !!employee;
  const createEmployee = useCreateClientEmployee();
  const updateEmployee = useUpdateClientEmployee();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      pesel: '',
      email: '',
      phone: '',
      contractType: EmployeeContractType.UMOWA_O_PRACE,
      position: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      grossSalaryPln: '',
      workingHoursPerWeek: '40',
      vacationDaysPerYear: '26',
      workplaceType: null,
      hourlyRatePln: '',
      isStudent: false,
      hasOtherInsurance: false,
      projectDescription: '',
      deliveryDate: '',
      agreedAmountPln: '',
      notes: '',
    },
  });

  const watchContractType = form.watch('contractType');

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        pesel: employee.pesel || '',
        email: employee.email || '',
        phone: employee.phone || '',
        contractType: employee.contractType,
        position: employee.position || '',
        startDate: employee.startDate ? employee.startDate.split('T')[0] : '',
        endDate: employee.endDate ? employee.endDate.split('T')[0] : '',
        grossSalaryPln: groszeToPln(employee.grossSalary),
        workingHoursPerWeek: employee.workingHoursPerWeek?.toString() || '',
        vacationDaysPerYear: employee.vacationDaysPerYear?.toString() || '',
        workplaceType: employee.workplaceType || null,
        hourlyRatePln: groszeToPln(employee.hourlyRate),
        isStudent: employee.isStudent || false,
        hasOtherInsurance: employee.hasOtherInsurance || false,
        projectDescription: employee.projectDescription || '',
        deliveryDate: employee.deliveryDate ? employee.deliveryDate.split('T')[0] : '',
        agreedAmountPln: groszeToPln(employee.agreedAmount),
        notes: employee.notes || '',
      });
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        pesel: '',
        email: '',
        phone: '',
        contractType: EmployeeContractType.UMOWA_O_PRACE,
        position: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        grossSalaryPln: '',
        workingHoursPerWeek: '40',
        vacationDaysPerYear: '26',
        workplaceType: null,
        hourlyRatePln: '',
        isStudent: false,
        hasOtherInsurance: false,
        projectDescription: '',
        deliveryDate: '',
        agreedAmountPln: '',
        notes: '',
      });
    }
  }, [employee, form, open]);

  const onSubmit = async (values: FormValues) => {
    const baseData = {
      firstName: values.firstName,
      lastName: values.lastName,
      pesel: values.pesel || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      contractType: values.contractType,
      position: values.position || undefined,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      notes: values.notes || undefined,
    };

    let data: CreateClientEmployeeDto | UpdateClientEmployeeDto;

    switch (values.contractType) {
      case EmployeeContractType.UMOWA_O_PRACE:
        data = {
          ...baseData,
          grossSalary: plnToGrosze(values.grossSalaryPln),
          workingHoursPerWeek: values.workingHoursPerWeek
            ? parseFloat(values.workingHoursPerWeek)
            : undefined,
          vacationDaysPerYear: values.vacationDaysPerYear
            ? parseInt(values.vacationDaysPerYear)
            : undefined,
          workplaceType: values.workplaceType || undefined,
          // Clear other contract type fields
          hourlyRate: null,
          isStudent: null,
          hasOtherInsurance: null,
          projectDescription: null,
          deliveryDate: null,
          agreedAmount: null,
        } as UpdateClientEmployeeDto;
        break;

      case EmployeeContractType.UMOWA_ZLECENIE:
        data = {
          ...baseData,
          grossSalary: plnToGrosze(values.grossSalaryPln),
          hourlyRate: plnToGrosze(values.hourlyRatePln),
          isStudent: values.isStudent,
          hasOtherInsurance: values.hasOtherInsurance,
          // Clear other contract type fields
          workingHoursPerWeek: null,
          vacationDaysPerYear: null,
          workplaceType: null,
          projectDescription: null,
          deliveryDate: null,
          agreedAmount: null,
        } as UpdateClientEmployeeDto;
        break;

      case EmployeeContractType.UMOWA_O_DZIELO:
        data = {
          ...baseData,
          projectDescription: values.projectDescription || undefined,
          deliveryDate: values.deliveryDate || undefined,
          agreedAmount: plnToGrosze(values.agreedAmountPln),
          // Clear other contract type fields
          grossSalary: null,
          workingHoursPerWeek: null,
          vacationDaysPerYear: null,
          workplaceType: null,
          hourlyRate: null,
          isStudent: null,
          hasOtherInsurance: null,
        } as UpdateClientEmployeeDto;
        break;

      default:
        data = baseData;
    }

    try {
      if (isEditing) {
        await updateEmployee.mutateAsync({
          clientId,
          employeeId: employee.id,
          data: data as UpdateClientEmployeeDto,
        });
      } else {
        await createEmployee.mutateAsync({
          clientId,
          data: data as CreateClientEmployeeDto,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handling is done in the mutation hooks
    }
  };

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj pracownika' : 'Dodaj pracownika'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Edytuj dane pracownika ${employee.firstName} ${employee.lastName}`
              : `Dodaj nowego pracownika dla klienta "${clientName}"`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Data */}
            <div>
              <h3 className="text-apptax-navy mb-4 text-lg font-semibold">Dane osobowe</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwisko *</FormLabel>
                      <FormControl>
                        <Input placeholder="Kowalski" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pesel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PESEL</FormLabel>
                      <FormControl>
                        <Input placeholder="90010112345" maxLength={11} {...field} />
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
                        <Input type="email" placeholder="jan@example.com" {...field} />
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

            <Separator />

            {/* Employment Data */}
            <div>
              <h3 className="text-apptax-navy mb-4 text-lg font-semibold">Dane zatrudnienia</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ umowy *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz typ umowy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EmployeeContractTypeLabels).map(([value, label]) => (
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

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stanowisko</FormLabel>
                      <FormControl>
                        <Input placeholder="Specjalista ds. marketingu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data rozpoczęcia *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data zakończenia</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contract-type specific fields */}
            {watchContractType === EmployeeContractType.UMOWA_O_PRACE && (
              <div>
                <h3 className="text-apptax-navy mb-4 text-lg font-semibold">
                  Szczegóły umowy o pracę
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grossSalaryPln"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wynagrodzenie brutto (PLN)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="8500.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workingHoursPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Godziny pracy / tydzień</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" placeholder="40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vacationDaysPerYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dni urlopu / rok</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="26" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workplaceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miejsce pracy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(WorkplaceTypeLabels).map(([value, label]) => (
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
                </div>
              </div>
            )}

            {watchContractType === EmployeeContractType.UMOWA_ZLECENIE && (
              <div>
                <h3 className="text-apptax-navy mb-4 text-lg font-semibold">
                  Szczegóły umowy zlecenia
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grossSalaryPln"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wynagrodzenie brutto (PLN)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5000.00" {...field} />
                        </FormControl>
                        <FormDescription>Miesięczne wynagrodzenie brutto</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourlyRatePln"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stawka godzinowa (PLN)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2 space-y-4">
                    <FormField
                      control={form.control}
                      name="isStudent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Student (poniżej 26 lat)</FormLabel>
                            <FormDescription>Wpływa na obowiązek składek ZUS</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasOtherInsurance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Posiada inne ubezpieczenie</FormLabel>
                            <FormDescription>Np. z tytułu innej umowy o pracę</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {watchContractType === EmployeeContractType.UMOWA_O_DZIELO && (
              <div>
                <h3 className="text-apptax-navy mb-4 text-lg font-semibold">
                  Szczegóły umowy o dzieło
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="agreedAmountPln"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kwota umowy (PLN)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="15000.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data dostarczenia dzieła</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="projectDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis dzieła</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Przygotowanie dokumentacji technicznej systemu..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje o pracowniku..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                className="bg-apptax-blue hover:bg-apptax-blue/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj pracownika'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
