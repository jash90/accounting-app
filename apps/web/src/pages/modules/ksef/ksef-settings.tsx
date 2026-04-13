import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Loader2, Settings, TestTube } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/auth-context';
import type { KsefConfigResponse, KsefConnectionTestResult } from '@/lib/api/endpoints/ksef';
import { useKsefConfig, useUpdateKsefConfig, useTestKsefConnection } from '@/lib/hooks/use-ksef';
import { formatDate } from '@/lib/utils/format-date';
import { KsefEnvironment, KsefEnvironmentLabels, KsefAuthMethod, KsefAuthMethodLabels, UserRole } from '@/types/enums';

const configSchema = z.object({
  environment: z.nativeEnum(KsefEnvironment),
  authMethod: z.nativeEnum(KsefAuthMethod),
  token: z.string().optional(),
  certificate: z.string().optional(),
  certificatePassword: z.string().optional(),
  nip: z.string().regex(/^\d{10}$/, 'NIP musi zawierać dokładnie 10 cyfr').or(z.literal('')).optional(),
  autoSendEnabled: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

function KsefSettingsForm({ config }: { config: KsefConfigResponse | null }) {
  const { user } = useAuthContext();
  const isAdmin = user?.role === UserRole.ADMIN;
  const updateConfig = useUpdateKsefConfig();
  const testConnection = useTestKsefConnection();
  const [testResult, setTestResult] = useState<KsefConnectionTestResult | null>(null);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      environment: (config?.environment as KsefEnvironment) || KsefEnvironment.TEST,
      authMethod: (config?.authMethod as KsefAuthMethod) || KsefAuthMethod.TOKEN,
      token: '',
      certificate: '',
      certificatePassword: '',
      nip: config?.nip || '',
      autoSendEnabled: config?.autoSendEnabled ?? false,
    },
  });

  const authMethod = form.watch('authMethod');
  const environment = form.watch('environment');

  const onSubmit = (values: ConfigFormValues) => {
    updateConfig.mutate({
      environment: values.environment,
      authMethod: values.authMethod,
      token: values.token || undefined,
      certificate: values.certificate || undefined,
      certificatePassword: values.certificatePassword || undefined,
      nip: values.nip || undefined,
      autoSendEnabled: values.autoSendEnabled,
    });
  };

  const handleTestConnection = () => {
    setTestResult(null);
    testConnection.mutate(undefined, {
      onSuccess: (data) => setTestResult(data as KsefConnectionTestResult),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ustawienia KSeF"
        description="Konfiguracja połączenia z Krajowym Systemem e-Faktur"
        icon={<Settings className="h-6 w-6" />}
        action={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Środowisko KSeF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Środowisko</FormLabel>
                      {isAdmin ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz środowisko" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(KsefEnvironment).map((env) => (
                              <SelectItem key={env} value={env}>{KsefEnvironmentLabels[env]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={KsefEnvironmentLabels[field.value] || field.value} disabled />
                      )}
                      <FormDescription>
                        {isAdmin ? 'Środowisko KSeF do komunikacji' : 'Środowisko ustawione przez administratora'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="authMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metoda uwierzytelniania</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz metodę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(KsefAuthMethod).map((method) => (
                            <SelectItem key={method} value={method}>{KsefAuthMethodLabels[method]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {environment === KsefEnvironment.PRODUCTION && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Uwaga: przełączasz na środowisko produkcyjne KSeF. Wszystkie faktury będą rejestrowane w systemie podatkowym.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dane uwierzytelniające</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {authMethod === KsefAuthMethod.TOKEN ? (
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token KSeF</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={config?.hasToken ? '••••••••• (zapisany)' : 'Wpisz token KSeF'} {...field} />
                      </FormControl>
                      <FormDescription>Pozostaw puste, aby zachować istniejący token</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="certificate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certyfikat XAdES (Base64)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={config?.hasCertificate ? '••••••••• (zapisany)' : 'Wpisz certyfikat'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certificatePassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hasło certyfikatu</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Hasło do certyfikatu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" maxLength={10} inputMode="numeric" {...field} />
                    </FormControl>
                    <FormDescription>NIP firmy do komunikacji z KSeF</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ustawienia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="autoSendEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Automatyczne wysyłanie</FormLabel>
                      <FormDescription>Automatycznie wysyłaj faktury do KSeF po utworzeniu</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Test połączenia</p>
                    {config?.lastConnectionTestAt && (
                      <p className="text-sm text-muted-foreground">
                        Ostatni test: {formatDate(config.lastConnectionTestAt)}
                      </p>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testConnection.isPending || !config}>
                            {testConnection.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                            Testuj
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!config && <TooltipContent>Najpierw zapisz konfigurację</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertDescription>
                      {testResult.message}
                      <span className="ml-2 text-xs text-muted-foreground">({testResult.responseTimeMs}ms)</span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}

export default function KsefSettingsPage() {
  const { data: config, isLoading } = useKsefConfig();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ustawienia KSeF" icon={<Settings className="h-6 w-6" />} />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const resolvedConfig = config && typeof config === 'object' && 'id' in config
    ? config as KsefConfigResponse
    : null;

  return <KsefSettingsForm key={resolvedConfig?.id ?? 'new'} config={resolvedConfig} />;
}
