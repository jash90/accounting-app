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
import {
  createEmailConfigSchema,
  updateEmailConfigSchema,
  CreateEmailConfigFormData,
  UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';
import { EmailConfigResponseDto } from '@/types/dtos';
import { Mail, Send, Download } from 'lucide-react';

interface EmailConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: EmailConfigResponseDto;
  onSubmit: (data: CreateEmailConfigFormData | UpdateEmailConfigFormData) => void;
  type: 'user' | 'company';
}

export function EmailConfigFormDialog({
  open,
  onOpenChange,
  config,
  onSubmit,
  type,
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

  const handleSubmit = (data: CreateEmailConfigFormData | UpdateEmailConfigFormData) => {
    onSubmit(data);
    form.reset();
  };

  const title = type === 'company' ? 'Company Email Configuration' : 'Personal Email Configuration';
  const description =
    type === 'company'
      ? 'Configure email settings for your company. This will be used for company-wide email communications.'
      : 'Configure your personal email settings for sending and receiving emails.';

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
