import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  createEmailConfigSchema,
  updateEmailConfigSchema,
  CreateEmailConfigFormData,
  UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';
import { EmailConfigResponseDto, TestSmtpDto, TestImapDto } from '@/types/dtos';
import { Mail, Send, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

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
  const isEditing = !!config;
  const schema = isEditing ? updateEmailConfigSchema : createEmailConfigSchema;

  const form = useForm<CreateEmailConfigFormData | UpdateEmailConfigFormData>({
    resolver: zodResolver(schema),
    defaultValues: config
      ? {
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
        }
      : {
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
        },
  });

  // Reset form when dialog opens with config data
  useEffect(() => {
    if (open && config) {
      form.reset({
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
      });
    } else if (open && !config) {
      form.reset({
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
      });
    }
  }, [open, config, form]);

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

  const canTestSmtp = !!(
    form.watch('smtpHost') &&
    form.watch('smtpPort') &&
    form.watch('smtpUser') &&
    form.watch('smtpPassword')
  );

  const canTestImap = !!(
    form.watch('imapHost') &&
    form.watch('imapPort') &&
    form.watch('imapUser') &&
    form.watch('imapPassword')
  );

  const getTitle = () => {
    switch (type) {
      case 'company':
        return 'Company Email Configuration';
      case 'system-admin':
        return 'System Admin Email Configuration';
      default:
        return 'Personal Email Configuration';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'company':
        return 'Configure email settings for your company. This will be used for company-wide email communications.';
      case 'system-admin':
        return 'Configure shared email settings for all administrators. This will be used for system-wide email communications.';
      default:
        return 'Configure your personal email settings for sending and receiving emails.';
    }
  };

  const title = getTitle();
  const description = getDescription();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isEditing ? `Edit ${title}` : `Create ${title}`}
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
                  <FormLabel>Display Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="My Email Account" {...field} />
                  </FormControl>
                  <FormDescription>A friendly name to identify this email configuration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SMTP Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-apptax-blue" />
                <h3 className="text-lg font-semibold text-apptax-navy">SMTP Configuration (Outgoing Mail)</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
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
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="465"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(form.watch('smtpPort') === 465 || form.watch('smtpPort') === 587) && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Niektórzy dostawcy poczty (np. Onet, Interia, WP) wymagają włączenia dostępu SMTP w panelu
                    użytkownika konta email. Jeśli wystąpią błędy uwierzytelniania, sprawdź ustawienia bezpieczeństwa
                    w panelu swojego dostawcy poczty.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Use SSL/TLS</FormLabel>
                      <FormDescription>Enable secure connection (recommended for port 465)</FormDescription>
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
                    <FormLabel>SMTP Username (Email)</FormLabel>
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
                    <FormLabel>SMTP Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? '••••••••' : 'Enter password'}
                        {...field}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>Leave empty to keep existing password</FormDescription>
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
                <Download className="h-4 w-4 text-apptax-teal" />
                <h3 className="text-lg font-semibold text-apptax-navy">IMAP Configuration (Incoming Mail)</h3>
              </div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imapHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Host</FormLabel>
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
                      <FormLabel>IMAP Port</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="993"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('imapPort') === 993 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Niektórzy dostawcy poczty (np. Onet, Interia, WP) wymagają włączenia dostępu IMAP w panelu
                    użytkownika konta email. Jeśli wystąpią błędy uwierzytelniania, sprawdź ustawienia bezpieczeństwa
                    w panelu swojego dostawcy poczty.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="imapTls"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Use TLS</FormLabel>
                      <FormDescription>Enable secure connection (recommended for port 993)</FormDescription>
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
                    <FormLabel>IMAP Username (Email)</FormLabel>
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
                    <FormLabel>IMAP Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? '••••••••' : 'Enter password'}
                        {...field}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>Leave empty to keep existing password</FormDescription>
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
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Update Configuration' : 'Create Configuration'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
