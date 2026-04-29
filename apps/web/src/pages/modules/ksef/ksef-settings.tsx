import { useRef, useState } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Settings,
  TestTube,
  Upload,
  X,
} from 'lucide-react';
import { z } from 'zod';

import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { KsefConfigResponse, KsefConnectionTestResult } from '@/lib/api/endpoints/ksef';
import {
  useKsefConfig,
  useKsefConfigPolicy,
  useTestKsefConnection,
  useUpdateKsefConfig,
  useUploadKsefCredentials,
} from '@/lib/hooks/use-ksef';
import { formatDate } from '@/lib/utils/format-date';
import {
  KsefAuthMethod,
  KsefAuthMethodLabels,
  KsefEnvironment,
  KsefEnvironmentLabels,
} from '@/types/enums';

const CERT_ACCEPT = '.pem,.crt,.cer';
const KEY_ACCEPT = '.pem,.key';

const configSchema = z.object({
  environment: z.nativeEnum(KsefEnvironment),
  authMethod: z.nativeEnum(KsefAuthMethod),
  token: z.string().optional(),
  certificatePassword: z.string().optional(),
  nip: z
    .string()
    .regex(/^\d{10}$/, 'NIP musi zawierać dokładnie 10 cyfr')
    .or(z.literal(''))
    .optional(),
  autoSendEnabled: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

function KsefSettingsForm({ config }: { config: KsefConfigResponse | null }) {
  // The environment selector is gated by the operator-set `KSEF_ALLOW_ENV_CHANGE`
  // env flag, surfaced via the policy endpoint. Falls back to `false` until the
  // policy loads — safer to start locked than to flash an editable selector
  // that disappears once the policy resolves.
  const { data: policy } = useKsefConfigPolicy();
  const canChangeEnvironment =
    policy?.canChangeEnvironment ?? config?.canChangeEnvironment ?? false;
  const updateConfig = useUpdateKsefConfig();
  const uploadCredentials = useUploadKsefCredentials();
  const testConnection = useTestKsefConnection();
  const [testResult, setTestResult] = useState<KsefConnectionTestResult | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      environment: (config?.environment as KsefEnvironment) || KsefEnvironment.TEST,
      authMethod: (config?.authMethod as KsefAuthMethod) || KsefAuthMethod.TOKEN,
      token: '',
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
      certificatePassword: values.certificatePassword || undefined,
      nip: values.nip || undefined,
      autoSendEnabled: values.autoSendEnabled,
    });
  };

  const handleUploadCredentials = () => {
    if (!certFile && !keyFile) return;
    const formData = new FormData();
    if (certFile) formData.append('certificate', certFile);
    if (keyFile) formData.append('privateKey', keyFile);
    // Send the non-secret form values along with the files so a single click
    // produces a config the XAdES auth flow will accept — XAdES auth requires
    // NIP, and forcing the user to click "Wgraj pliki" → main "Zapisz"
    // → "Test połączenia" before anything works was a footgun.
    const password = form.getValues('certificatePassword');
    if (password) formData.append('certificatePassword', password);
    const nip = form.getValues('nip');
    if (nip) formData.append('nip', nip);
    formData.append('autoSendEnabled', String(form.getValues('autoSendEnabled')));
    uploadCredentials.mutate(formData, {
      onSuccess: () => {
        setCertFile(null);
        setKeyFile(null);
        if (certInputRef.current) certInputRef.current.value = '';
        if (keyInputRef.current) keyInputRef.current.value = '';
      },
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
                      {canChangeEnvironment ? (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz środowisko" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(KsefEnvironment).map((env) => (
                              <SelectItem key={env} value={env}>
                                {KsefEnvironmentLabels[env]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={KsefEnvironmentLabels[field.value] || field.value} disabled />
                      )}
                      <FormDescription>
                        {canChangeEnvironment
                          ? 'Środowisko KSeF do komunikacji'
                          : 'Środowisko ustawione przez administratora systemu'}
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
                            <SelectItem key={method} value={method}>
                              {KsefAuthMethodLabels[method]}
                            </SelectItem>
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
                Uwaga: przełączasz na środowisko produkcyjne KSeF. Wszystkie faktury będą
                rejestrowane w systemie podatkowym.
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
                        <Input
                          type="password"
                          placeholder={
                            config?.hasToken ? '••••••••• (zapisany)' : 'Wpisz token KSeF'
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Pozostaw puste, aby zachować istniejący token
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    <FormLabel>Certyfikat X.509 (PEM)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => certInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {certFile ? 'Zmień plik' : 'Wybierz plik'}
                      </Button>
                      {certFile ? (
                        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                          <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="max-w-48 truncate">{certFile.name}</span>
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setCertFile(null);
                              if (certInputRef.current) certInputRef.current.value = '';
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : config?.hasCertificate ? (
                        <span className="text-sm text-muted-foreground">Certyfikat zapisany</span>
                      ) : null}
                    </div>
                    <input
                      ref={certInputRef}
                      type="file"
                      accept={CERT_ACCEPT}
                      className="hidden"
                      onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">Plik .pem, .crt lub .cer</p>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Klucz prywatny (PEM)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => keyInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {keyFile ? 'Zmień plik' : 'Wybierz plik'}
                      </Button>
                      {keyFile ? (
                        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
                          <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="max-w-48 truncate">{keyFile.name}</span>
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setKeyFile(null);
                              if (keyInputRef.current) keyInputRef.current.value = '';
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : config?.hasPrivateKey ? (
                        <span className="text-sm text-muted-foreground">Klucz zapisany</span>
                      ) : null}
                    </div>
                    <input
                      ref={keyInputRef}
                      type="file"
                      accept={KEY_ACCEPT}
                      className="hidden"
                      onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">Plik .pem lub .key</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="certificatePassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hasło klucza prywatnego</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Hasło do klucza prywatnego (opcjonalnie)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(certFile || keyFile) && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUploadCredentials}
                      disabled={uploadCredentials.isPending}
                    >
                      {uploadCredentials.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Wgraj pliki
                    </Button>
                  )}
                </>
              )}

              <FormField
                control={form.control}
                name="nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890"
                        maxLength={10}
                        inputMode="numeric"
                        {...field}
                      />
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
                      <FormDescription>
                        Automatycznie wysyłaj faktury do KSeF po utworzeniu
                      </FormDescription>
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
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testConnection.isPending || !config}
                          >
                            {testConnection.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="mr-2 h-4 w-4" />
                            )}
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
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {testResult.message}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({testResult.responseTimeMs}ms)
                      </span>
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

  const resolvedConfig =
    config && typeof config === 'object' && 'id' in config ? (config as KsefConfigResponse) : null;

  return <KsefSettingsForm key={resolvedConfig?.id ?? 'new'} config={resolvedConfig} />;
}
