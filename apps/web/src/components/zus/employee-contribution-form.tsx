import { useMemo } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info, Users } from 'lucide-react';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientEmployees } from '@/lib/hooks/use-clients';
import {
  useCalculateEmployeeContributions,
  useZusContributionsByClient,
} from '@/lib/hooks/use-zus';
import { EmployeeContractType } from '@/types/enums';

const MONTHS = [
  { value: 1, label: 'Stycze\u0144' },
  { value: 2, label: 'Luty' },
  { value: 3, label: 'Marzec' },
  { value: 4, label: 'Kwiecie\u0144' },
  { value: 5, label: 'Maj' },
  { value: 6, label: 'Czerwiec' },
  { value: 7, label: 'Lipiec' },
  { value: 8, label: 'Sierpie\u0144' },
  { value: 9, label: 'Wrzesie\u0144' },
  { value: 10, label: 'Pa\u017adziernik' },
  { value: 11, label: 'Listopad' },
  { value: 12, label: 'Grudzie\u0144' },
];

const CONTRACT_TYPE_LABELS: Record<EmployeeContractType, string> = {
  [EmployeeContractType.UMOWA_O_PRACE]: 'Umowa o prac\u0119',
  [EmployeeContractType.UMOWA_ZLECENIE]: 'Umowa zlecenie',
  [EmployeeContractType.UMOWA_O_DZIELO]: 'Umowa o dzie\u0142o',
};

const CONTRACT_TYPE_COLORS: Record<EmployeeContractType, string> = {
  [EmployeeContractType.UMOWA_O_PRACE]: 'bg-green-100 text-green-800',
  [EmployeeContractType.UMOWA_ZLECENIE]: 'bg-blue-100 text-blue-800',
  [EmployeeContractType.UMOWA_O_DZIELO]: 'bg-orange-100 text-orange-800',
};

const formSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'Wybierz co najmniej jednego pracownika'),
  periodMonth: z.number().min(1).max(12),
  periodYear: z.number().min(2020),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeContributionFormProps {
  clientId: string;
  onSuccess?: () => void;
}

export function EmployeeContributionForm({ clientId, onSuccess }: EmployeeContributionFormProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const { data: employeesData, isLoading: employeesLoading } = useClientEmployees(clientId, {
    isActive: true,
    limit: 100,
  });

  const { data: existingContributions } = useZusContributionsByClient(clientId);
  const calculateMutation = useCalculateEmployeeContributions();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeIds: [],
      periodMonth: currentMonth,
      periodYear: currentYear,
    },
  });

  const watchedMonth = form.watch('periodMonth');
  const watchedYear = form.watch('periodYear');
  const selectedEmployeeIds = form.watch('employeeIds');

  // Get already calculated periods for each employee
  const employeeCalculatedPeriods = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!existingContributions) return map;

    existingContributions
      .filter((c) => c.contributionType === 'EMPLOYEE' && c.clientEmployeeId)
      .forEach((c) => {
        const key = c.clientEmployeeId!;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key)!.add(`${c.periodMonth}-${c.periodYear}`);
      });

    return map;
  }, [existingContributions]);

  // Check if employee already has contribution for selected period
  const isEmployeeAlreadyCalculated = (employeeId: string) => {
    const periods = employeeCalculatedPeriods.get(employeeId);
    if (!periods) return false;
    return periods.has(`${watchedMonth}-${watchedYear}`);
  };

  // Get employee ZUS status info
  const getEmployeeZusInfo = (employee: {
    contractType: EmployeeContractType;
    isStudent?: boolean;
    hasOtherInsurance?: boolean;
  }) => {
    if (employee.contractType === EmployeeContractType.UMOWA_O_DZIELO) {
      return { exempt: true, reason: 'Umowa o dzie\u0142o - brak sk\u0142adek ZUS' };
    }
    if (employee.contractType === EmployeeContractType.UMOWA_ZLECENIE && employee.isStudent) {
      return { exempt: true, reason: 'Student poni\u017cej 26 lat - zwolniony z ZUS' };
    }
    if (
      employee.contractType === EmployeeContractType.UMOWA_ZLECENIE &&
      employee.hasOtherInsurance
    ) {
      return { exempt: false, reason: 'Tylko sk\u0142adka zdrowotna' };
    }
    return { exempt: false, reason: null };
  };

  const employees = employeesData?.data ?? [];
  const eligibleEmployees = employees.filter(
    (e) => !getEmployeeZusInfo(e).exempt && !isEmployeeAlreadyCalculated(e.id)
  );
  const exemptEmployees = employees.filter((e) => getEmployeeZusInfo(e).exempt);

  const handleSelectAll = () => {
    form.setValue(
      'employeeIds',
      eligibleEmployees.map((e) => e.id)
    );
  };

  const handleDeselectAll = () => {
    form.setValue('employeeIds', []);
  };

  const onSubmit = async (data: FormData) => {
    await calculateMutation.mutateAsync({
      clientId,
      employeeIds: data.employeeIds,
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
    });
    form.reset();
    onSuccess?.();
  };

  if (employeesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>Brak pracownik\u00f3w</AlertTitle>
        <AlertDescription>
          Ten klient nie ma zdefiniowanych pracownik\u00f3w. Dodaj pracownik\u00f3w w zak\u0142adce
          &quot;Pracownicy&quot; w szczeg\u00f3\u0142ach klienta.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Period Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="periodMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Miesi\u0105c</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz miesi\u0105c" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
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
            name="periodYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rok</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz rok" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Employee Selection */}
        <FormField
          control={form.control}
          name="employeeIds"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Pracownicy</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={eligibleEmployees.length === 0}
                  >
                    Zaznacz wszystkich
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedEmployeeIds.length === 0}
                  >
                    Odznacz wszystkich
                  </Button>
                </div>
              </div>
              <FormDescription>
                Wybierz pracownik\u00f3w, dla kt\u00f3rych chcesz obliczy\u0107 sk\u0142adki ZUS
              </FormDescription>

              <div className="space-y-2 mt-2 max-h-64 overflow-y-auto border rounded-md p-2">
                {employees.map((employee) => {
                  const zusInfo = getEmployeeZusInfo(employee);
                  const alreadyCalculated = isEmployeeAlreadyCalculated(employee.id);
                  const isDisabled = zusInfo.exempt || alreadyCalculated;

                  return (
                    <FormField
                      key={employee.id}
                      control={form.control}
                      name="employeeIds"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 p-2 rounded hover:bg-muted/50">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(employee.id)}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, employee.id])
                                  : field.onChange(
                                      field.value?.filter((value) => value !== employee.id)
                                    );
                              }}
                            />
                          </FormControl>
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={isDisabled ? 'text-muted-foreground' : ''}>
                                {employee.firstName} {employee.lastName}
                              </span>
                              <Badge
                                variant="secondary"
                                className={CONTRACT_TYPE_COLORS[employee.contractType]}
                              >
                                {CONTRACT_TYPE_LABELS[employee.contractType]}
                              </Badge>
                              {employee.grossSalary && (
                                <span className="text-sm text-muted-foreground">
                                  ({(employee.grossSalary / 100).toFixed(2)} PLN)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {zusInfo.exempt && (
                                <Badge variant="outline" className="text-orange-600">
                                  Zwolniony
                                </Badge>
                              )}
                              {zusInfo.reason && !zusInfo.exempt && (
                                <Badge variant="outline" className="text-blue-600">
                                  {zusInfo.reason}
                                </Badge>
                              )}
                              {alreadyCalculated && (
                                <Badge variant="outline" className="text-green-600">
                                  Rozliczony
                                </Badge>
                              )}
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Info about exempt employees */}
        {exemptEmployees.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Pracownicy zwolnieni z ZUS</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {exemptEmployees.map((e) => (
                  <li key={e.id} className="text-sm">
                    {e.firstName} {e.lastName} - {getEmployeeZusInfo(e).reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        {selectedEmployeeIds.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Podsumowanie</AlertTitle>
            <AlertDescription>
              Wybrano {selectedEmployeeIds.length} pracownik\u00f3w do rozliczenia za{' '}
              {MONTHS.find((m) => m.value === watchedMonth)?.label} {watchedYear}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={calculateMutation.isPending || selectedEmployeeIds.length === 0}
        >
          {calculateMutation.isPending
            ? 'Obliczanie...'
            : `Oblicz sk\u0142adki dla ${selectedEmployeeIds.length} pracownik\u00f3w`}
        </Button>
      </form>
    </Form>
  );
}
