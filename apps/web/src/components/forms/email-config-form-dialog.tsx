import { useMemo } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle, Download, Loader2, Mail, Send } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  createEmailConfigSchema,
  updateEmailConfigSchema,
  type CreateEmailConfigFormData,
  type UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';
import { type EmailConfigResponseDto, type TestImapDto, type TestSmtpDto } from '@/types/dtos';

interface EmailConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: EmailConfigResponseDto;
  onSubmit: (data: CreateEmailConfigFormData | UpdateEmailConfigFormData) => void;
  type: 'user' | 'company' | 'system-admin';
  onTestSmtp?: (data: TestSmtpDto) => void;
  onTestImap?: (data: TestImapDto) => void;
  isTestingSmtp?: boolean;
  isTestingImap?: boolean;
}

export function EmailConfigFormDialog({
  open,
  onOpenChange,
  config,
  onSubmit,
  type,
  onTestSmtp,
  onTestImap,
  isTestingSmtp = false,
  isTestingImap = false,
}: EmailConfigFormDialogProps) {
  'use no memo';
  const isEditing = !!config;
  const schema = isEditing ? updateEmailConfigSchema : createEmailConfigSchema;

  // Compute form values synchronously - avoids useEffect render cycle
  // react-hook-form's `values` prop syncs external values without extra re-renders
  const formValues = useMemo((): CreateEmailConfigFormData | UpdateEmailConfigFormData => {
    if (config) {
      return {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPassword: '', // Never pre-fill passwords
        imapHost: config.imapHost,
        imapPort: config.imapPort,
        imapTls: config.imapTls,
        imapUser: config.imapUser,
        imapPassword: '', // Never pre-fill passwords
        displayName: config.displayName,
      };
    }
    return {
      smtpHost: '',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: '',
      smtpPassword: '',
      imapHost: '',
      imapPort: 993,
      imapTls: true,
      imapUser: '',
      imapPassword: '',
      displayName: '',
    };
  }, [config]);

  const form = useForm<CreateEmailConfigFormData | UpdateEmailConfigFormData>({
    resolver: zodResolver(schema),
    values: formValues, // Syncs values without useEffect - reduces render cycles
    resetOptions: {
      keepDirtyValues: false, // Reset all values when formValues changes
    },
  });

  const handleSubmit = (data: CreateEmailConfigFormData | UpdateEmailConfigFormData) => {
    // Note: Form reset is handled by parent closing dialog on success
    // Do NOT reset here - if mutation fails, user loses their data
    onSubmit(data);
  };

  const handleTestSmtp = () => {
    if (!onTestSmtp) return;

    const smtpHost = form.getValues('smtpHost');
    const smtpPort = form.getValues('smtpPort');
    const smtpSecure = form.getValues('smtpSecure');
    const smtpUser = form.getValues('smtpUser');
    const smtpPassword = form.getValues('smtpPassword');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return;
    }

    onTestSmtp({
      smtpHost,
      smtpPort,
      smtpSecure: smtpSecure ?? true,
      smtpUser,
      smtpPassword,
    });
  };

  const handleTestImap = () => {
    if (!onTestImap) return;

    const imapHost = form.getValues('imapHost');
    const imapPort = form.getValues('imapPort');
    const imapTls = form.getValues('imapTls');
    const imapUser = form.getValues('imapUser');
    const imapPassword = form.getValues('imapPassword');

    if (!imapHost || !imapPort || !imapUser || !imapPassword) {
      return;
    }

    onTestImap({
      imapHost,
      imapPort,
      imapTls: imapTls ?? true,
      imapUser,
      imapPassword,
    });
  };

  // Consolidate watch calls to prevent multiple subscriptions causing re-renders
  const [smtpHost, smtpPort, smtpUser, smtpPassword, imapHost, imapPort, imapUser, imapPassword] =
    form.watch([
      'smtpHost',
      'smtpPort',
      'smtpUser',
      'smtpPassword',
      'imapHost',
      'imapPort',
      'imapUser',
      'imapPassword',
    ]);

  const canTestSmtp = !!(smtpHost && smtpPort && smtpUser && smtpPassword);
  const canTestImap = !!(imapHost && imapPort && imapUser && imapPassword);

  const getTitle = () => {
    switch (type) {
      case 'company':
        return 'Konfiguracja email firmy';
      case 'system-admin':
        return 'Konfiguracja email administratora systemu';
      default:
        return 'Konfiguracja osobistego email';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'company':
        return 'Skonfiguruj ustawienia email dla swojej firmy. Będą używane do komunikacji email w całej firmie.';
      case 'system-admin':
        return 'Skonfiguruj wspólne ustawienia email dla wszystkich administratorów. Będą używane do komunikacji systemowej.';
      default:
        return 'Skonfiguruj swoje osobiste ustawienia email do wysyłania i odbierania wiadomości.';
    }
  };

  const title = getTitle();
  const description = getDescription();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isEditing ? `Edytuj: ${title}` : `Utwórz: ${title}`}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Display Name */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa wyświetlana (opcjonalna)</FormLabel>
                  <FormControl>
                    <Input placeholder="Moje konto email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Przyjazna nazwa do identyfikacji tej konfiguracji email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SMTP Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Send className="text-primary h-4 w-4" />
                <h3 className="text-foreground text-lg font-semibold">
                  Konfiguracja SMTP (poczta wychodząca)
                </h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host SMTP</FormLabel>
                      <FormControl>
                        <Input placeholder="mail.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port SMTP</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="465"
                          {...field}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            field.onChange(isNaN(parsed) ? undefined : parsed);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(smtpPort === 465 || smtpPort === 587) && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    Niektórzy dostawcy email wymagają włączenia dostępu SMTP w panelu użytkownika
                    konta email. Jeśli napotkasz błędy uwierzytelniania, sprawdź ustawienia
                    bezpieczeństwa w panelu dostawcy email.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Użyj SSL/TLS</FormLabel>
                      <FormDescription>
                        Włącz bezpieczne połączenie (zalecane dla portu 465)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa użytkownika SMTP (Email)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło SMTP</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? '••••••••' : 'Wprowadź hasło'}
                        {...field}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>Pozostaw puste, aby zachować obecne hasło</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {onTestSmtp && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={!canTestSmtp || isTestingSmtp}
                  className="w-full"
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testowanie...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Testuj połączenie SMTP
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* IMAP Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="text-accent h-4 w-4" />
                <h3 className="text-foreground text-lg font-semibold">
                  Konfiguracja IMAP (poczta przychodząca)
                </h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imapHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host IMAP</FormLabel>
                      <FormControl>
                        <Input placeholder="mail.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imapPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port IMAP</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="993"
                          {...field}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            field.onChange(isNaN(parsed) ? undefined : parsed);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {imapPort === 993 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    Niektórzy dostawcy email wymagają włączenia dostępu IMAP w panelu użytkownika
                    konta email. Jeśli napotkasz błędy uwierzytelniania, sprawdź ustawienia
                    bezpieczeństwa w panelu dostawcy email.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="imapTls"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Użyj TLS</FormLabel>
                      <FormDescription>
                        Włącz bezpieczne połączenie (zalecane dla portu 993)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imapUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa użytkownika IMAP (Email)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imapPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło IMAP</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? '••••••••' : 'Wprowadź hasło'}
                        {...field}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>Pozostaw puste, aby zachować obecne hasło</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {onTestImap && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestImap}
                  disabled={!canTestImap || isTestingImap}
                  className="w-full"
                >
                  {isTestingImap ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testowanie...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Testuj połączenie IMAP
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Zapisz konfigurację' : 'Utwórz konfigurację'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
