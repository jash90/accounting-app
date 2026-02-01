import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Calculator, Calendar, Users } from 'lucide-react';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/lib/hooks/use-clients';
import {
  useCalculateZusContribution,
  useGenerateMonthlyContributions,
  useZusRates,
} from '@/lib/hooks/use-zus';

const MONTHS = [
  { value: 1, label: 'Styczeń' },
  { value: 2, label: 'Luty' },
  { value: 3, label: 'Marzec' },
  { value: 4, label: 'Kwiecień' },
  { value: 5, label: 'Maj' },
  { value: 6, label: 'Czerwiec' },
  { value: 7, label: 'Lipiec' },
  { value: 8, label: 'Sierpień' },
  { value: 9, label: 'Wrzesień' },
  { value: 10, label: 'Październik' },
  { value: 11, label: 'Listopad' },
  { value: 12, label: 'Grudzień' },
];

const calculateSchema = z.object({
  clientId: z.string().uuid('Wybierz klienta'),
  periodMonth: z.coerce.number().min(1).max(12),
  periodYear: z.coerce.number().min(2020),
  healthBasis: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const generateSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
});

type CalculateFormData = z.infer<typeof calculateSchema>;
type GenerateFormData = z.infer<typeof generateSchema>;

export default function ZusContributionCreatePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  const { data: clients, isLoading: clientsLoading } = useClients({ limit: 1000 });
  const { data: rates, isLoading: ratesLoading } = useZusRates();
  const calculateMutation = useCalculateZusContribution();
  const generateMutation = useGenerateMonthlyContributions();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const calculateForm = useForm<CalculateFormData>({
    resolver: zodResolver(calculateSchema),
    defaultValues: {
      periodMonth: currentMonth,
      periodYear: currentYear,
    },
  });

  const generateForm = useForm<GenerateFormData>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
    },
  });

  const onCalculate = async (data: CalculateFormData) => {
    const result = await calculateMutation.mutateAsync({
      clientId: data.clientId,
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      healthBasis: data.healthBasis,
    });
    navigate(`../${result.id}`);
  };

  const onGenerate = async (data: GenerateFormData) => {
    await generateMutation.mutateAsync({
      month: data.month,
      year: data.year,
    });
    navigate('..');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('..')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Oblicz składki ZUS
          </h1>
          <p className="text-muted-foreground">
            Oblicz składki dla pojedynczego klienta lub wygeneruj dla wszystkich
          </p>
        </div>
      </div>

      {/* Current Rates Info */}
      {!ratesLoading && rates && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Aktualne stawki ZUS</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Pełny ZUS:</span>{' '}
                <strong>{rates.fullBasisPln} PLN</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Mały ZUS:</span>{' '}
                <strong>{rates.smallZusBasisPln} PLN</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Min. zdrowotna:</span>{' '}
                <strong>{rates.healthMinPln} PLN</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Min. wynagrodzenie:</span>{' '}
                <strong>{rates.minimumWagePln} PLN</strong>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
        >
          <Users className="mr-2 h-4 w-4" />
          Pojedynczy klient
        </Button>
        <Button variant={mode === 'batch' ? 'default' : 'outline'} onClick={() => setMode('batch')}>
          <Calendar className="mr-2 h-4 w-4" />
          Generuj dla wszystkich
        </Button>
      </div>

      {mode === 'single' ? (
        /* Single Client Form */
        <Card>
          <CardHeader>
            <CardTitle>Oblicz składki dla klienta</CardTitle>
            <CardDescription>
              Wybierz klienta i okres rozliczeniowy. Składki zostaną obliczone na podstawie ustawień
              ZUS klienta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...calculateForm}>
              <form onSubmit={calculateForm.handleSubmit(onCalculate)} className="space-y-6">
                <FormField
                  control={calculateForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klient</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz klienta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientsLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            clients?.data?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                                {client.nip && ` (NIP: ${client.nip})`}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Klient musi mieć skonfigurowane ustawienia ZUS
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={calculateForm.control}
                    name="periodMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miesiąc</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v, 10))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz miesiąc" />
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
                    control={calculateForm.control}
                    name="periodYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rok</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v, 10))}
                          defaultValue={field.value?.toString()}
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

                <FormField
                  control={calculateForm.control}
                  name="healthBasis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Podstawa zdrowotna (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Dochód miesięczny w groszach"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Podaj dochód miesięczny w groszach (np. 500000 = 5000 PLN). Jeśli nie
                        podasz, zostanie użyta minimalna składka.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={calculateForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notatki (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dodatkowe uwagi do rozliczenia..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={calculateMutation.isPending}>
                    {calculateMutation.isPending ? 'Obliczanie...' : 'Oblicz składki'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('..')}>
                    Anuluj
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        /* Batch Generation Form */
        <Card>
          <CardHeader>
            <CardTitle>Generuj rozliczenia dla wszystkich klientów</CardTitle>
            <CardDescription>
              Wygeneruj rozliczenia ZUS dla wszystkich klientów, którzy mają skonfigurowane
              ustawienia ZUS. Istniejące rozliczenia za ten okres zostaną pominięte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...generateForm}>
              <form onSubmit={generateForm.handleSubmit(onGenerate)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={generateForm.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miesiąc</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v, 10))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz miesiąc" />
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
                    control={generateForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rok</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v, 10))}
                          defaultValue={field.value?.toString()}
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

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Informacja</AlertTitle>
                  <AlertDescription>
                    Rozliczenia zostaną wygenerowane tylko dla klientów z aktywnymi ustawieniami
                    ZUS. Klienci bez ustawień zostaną pominięci.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button type="submit" disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? 'Generowanie...' : 'Generuj rozliczenia'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('..')}>
                    Anuluj
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
