import { useEffect } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Save, Settings } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
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
import { Switch } from '@/components/ui/switch';
import { useAuthContext } from '@/contexts/auth-context';
import { useTimeSettings, useUpdateTimeSettings } from '@/lib/hooks/use-time-tracking';
import { type UpdateTimeSettingsDto } from '@/types/dtos';
import { TimeRoundingMethod, TimeRoundingMethodLabels, UserRole } from '@/types/enums';

interface FormData {
  roundingMethod: TimeRoundingMethod;
  roundingIntervalMinutes: number;
  defaultHourlyRate: string;
  defaultCurrency: string;
  requireApproval: boolean;
  allowOverlappingEntries: boolean;
  autoStopTimerAtMidnight: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  minimumEntryDurationMinutes: number;
  maximumEntryDurationMinutes: number;
  workdayHours: number;
}

export default function TimeTrackingSettingsPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const { data: settings, isPending: settingsLoading } = useTimeSettings();
  const updateSettings = useUpdateTimeSettings();

  const form = useForm<FormData>({
    defaultValues: {
      roundingMethod: TimeRoundingMethod.NONE,
      roundingIntervalMinutes: 15,
      defaultHourlyRate: '',
      defaultCurrency: 'PLN',
      requireApproval: false,
      allowOverlappingEntries: false,
      autoStopTimerAtMidnight: true,
      reminderEnabled: false,
      reminderTime: '17:00',
      minimumEntryDurationMinutes: 1,
      maximumEntryDurationMinutes: 1440,
      workdayHours: 8,
    },
  });

  // Destructure reset for stable reference in useEffect deps
  const { reset } = form;

  useEffect(() => {
    if (settings) {
      reset({
        roundingMethod: settings.roundingMethod,
        roundingIntervalMinutes: settings.roundingIntervalMinutes,
        defaultHourlyRate: settings.defaultHourlyRate?.toString() || '',
        defaultCurrency: settings.defaultCurrency || 'PLN',
        requireApproval: settings.requireApproval,
        allowOverlappingEntries: settings.allowOverlappingEntries,
        autoStopTimerAtMidnight: settings.autoStopTimerAfterMinutes > 0,
        reminderEnabled: settings.enableDailyReminder,
        reminderTime: settings.dailyReminderTime || '17:00',
        minimumEntryDurationMinutes: settings.minimumEntryMinutes || 1,
        maximumEntryDurationMinutes: settings.maximumEntryMinutes || 1440,
        workdayHours: settings.workingHoursPerDay || 8,
      });
    }
  }, [settings, reset]);

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/time-tracking';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/time-tracking';
      default:
        return '/modules/time-tracking';
    }
  };

  const basePath = getBasePath();

  const onSubmit = (data: FormData) => {
    const updateData: UpdateTimeSettingsDto = {
      roundingMethod: data.roundingMethod,
      roundingIntervalMinutes: data.roundingIntervalMinutes,
      defaultHourlyRate: data.defaultHourlyRate ? parseFloat(data.defaultHourlyRate) : undefined,
      defaultCurrency: data.defaultCurrency,
      requireApproval: data.requireApproval,
      allowOverlappingEntries: data.allowOverlappingEntries,
      autoStopTimerAfterMinutes: data.autoStopTimerAtMidnight ? 1440 : 0,
      enableDailyReminder: data.reminderEnabled,
      dailyReminderTime: data.reminderTime,
      minimumEntryMinutes: data.minimumEntryDurationMinutes,
      maximumEntryMinutes: data.maximumEntryDurationMinutes,
      workingHoursPerDay: data.workdayHours,
    };

    updateSettings.mutate(updateData);
  };

  if (settingsLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Ustawienia logowania czasu"
        description="Konfiguracja modułu logowania czasu dla firmy"
        icon={<Settings className="h-6 w-6" />}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Rounding Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Zaokrąglanie czasu</CardTitle>
              <CardDescription>
                Ustawienia zaokrąglania wpisów czasu dla celów rozliczeniowych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roundingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metoda zaokrąglania</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TimeRoundingMethodLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Jak zaokrąglać czas przy zapisie wpisu</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roundingIntervalMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interwał zaokrąglania (minuty)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          {...field}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            field.onChange(isNaN(parsed) ? 1 : parsed);
                          }}
                        />
                      </FormControl>
                      <FormDescription>np. 15 = zaokrąglanie do 15 minut</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Default Values */}
          <Card>
            <CardHeader>
              <CardTitle>Wartości domyślne</CardTitle>
              <CardDescription>Domyślne ustawienia dla nowych wpisów czasu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultHourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domyślna stawka godzinowa</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="np. 150.00" {...field} />
                      </FormControl>
                      <FormDescription>Stawka używana gdy nie określono innej</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waluta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLN">PLN</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Workflow Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
              <CardDescription>Ustawienia procesu zatwierdzania i walidacji</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="requireApproval"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">Wymagaj zatwierdzenia</FormLabel>
                      <FormDescription>
                        Wpisy muszą być zatwierdzone przed rozliczeniem
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowOverlappingEntries"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">
                        Zezwalaj na nakładające się wpisy
                      </FormLabel>
                      <FormDescription>Czy można tworzyć wpisy w tym samym czasie</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoStopTimerAtMidnight"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">
                        Automatycznie zatrzymuj timer o północy
                      </FormLabel>
                      <FormDescription>Zapobiega bardzo długim wpisom</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Godziny pracy</CardTitle>
              <CardDescription>Definiuj standardowy dzień pracy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="workdayHours"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Godzin dziennie</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>Standardowa liczba godzin pracy dziennie</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Limity</CardTitle>
              <CardDescription>Minimalny i maksymalny czas trwania wpisu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minimumEntryDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimalny czas wpisu (minuty)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maximumEntryDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maksymalny czas wpisu (minuty)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormDescription>1440 = 24 godziny</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
