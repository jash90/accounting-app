import { useState } from 'react';

import { Mail, Edit, Trash2, Plus, Server, Lock } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { EmailConfigFormDialog } from '@/components/forms/email-config-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useUserEmailConfig,
  useCreateUserEmailConfig,
  useUpdateUserEmailConfig,
  useDeleteUserEmailConfig,
  useTestSmtp,
  useTestImap,
} from '@/lib/hooks/use-email-config';
import {
  type CreateEmailConfigFormData,
  type UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';

export default function UserEmailConfigPage() {
  const { data: emailConfig, isPending, isError, error } = useUserEmailConfig();
  const createConfig = useCreateUserEmailConfig();
  const updateConfig = useUpdateUserEmailConfig();
  const deleteConfig = useDeleteUserEmailConfig();
  const testSmtp = useTestSmtp();
  const testImap = useTestImap();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasConfig = !!emailConfig && !isError;

  const handleSubmit = (data: CreateEmailConfigFormData | UpdateEmailConfigFormData) => {
    if (hasConfig) {
      updateConfig.mutate(data as UpdateEmailConfigFormData, {
        onSuccess: () => setFormOpen(false),
        onError: (err: Error) => {
          toast({
            title: 'Error',
            description: err.message || 'Failed to update email configuration',
            variant: 'destructive',
          });
        },
      });
    } else {
      createConfig.mutate(data as CreateEmailConfigFormData, {
        onSuccess: () => setFormOpen(false),
        onError: (err: Error) => {
          toast({
            title: 'Error',
            description: err.message || 'Failed to create email configuration',
            variant: 'destructive',
          });
        },
      });
    }
  };

  const handleDelete = () => {
    deleteConfig.mutate(undefined, {
      onSuccess: () => setDeleteOpen(false),
      onError: (err: Error) => {
        toast({
          title: 'Error',
          description: err.message || 'Failed to delete email configuration',
          variant: 'destructive',
        });
        setDeleteOpen(false);
      },
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email Configuration"
        description="Manage your personal email settings for sending and receiving emails"
        icon={<Mail className="h-6 w-6" />}
        action={
          hasConfig ? (
            <div className="flex gap-2">
              <Button onClick={() => setFormOpen(true)} variant="secondary" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Configuration
              </Button>
              <Button onClick={() => setDeleteOpen(true)} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Configuration
            </Button>
          )
        }
      />

      {/* Loading State */}
      {isPending && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {/* Error State - No Configuration */}
      {isError && error?.response?.status === 404 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-apptax-soft-teal rounded-full p-4">
                <Mail className="text-apptax-blue h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-apptax-navy text-lg font-semibold">No Email Configuration</h3>
                <p className="text-muted-foreground max-w-md">
                  You haven&apos;t configured your email settings yet. Create a configuration to
                  start sending and receiving emails through the platform.
                </p>
              </div>
              <Button onClick={() => setFormOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Email Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State - Other Errors */}
      {isError && error?.response?.status !== 404 && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 rounded p-2">
                <Mail className="text-destructive h-5 w-5" />
              </div>
              <div>
                <h3 className="text-destructive font-semibold">Error Loading Configuration</h3>
                <p className="text-muted-foreground text-sm">
                  {error.message || 'Failed to load email configuration'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Display */}
      {hasConfig && emailConfig && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* SMTP Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="text-apptax-blue h-5 w-5" />
                  <CardTitle>SMTP Configuration</CardTitle>
                </div>
                <Badge variant={emailConfig.isActive ? 'success' : 'muted'}>
                  {emailConfig.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>Outgoing mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Host</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.smtpHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.smtpPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security</span>
                  <Badge variant={emailConfig.smtpSecure ? 'success' : 'secondary'}>
                    {emailConfig.smtpSecure ? 'SSL/TLS' : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.smtpUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <Lock className="text-apptax-teal h-3 w-3" />
                    <span className="text-muted-foreground text-xs">Encrypted</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IMAP Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="text-apptax-teal h-5 w-5" />
                  <CardTitle>IMAP Configuration</CardTitle>
                </div>
                <Badge variant={emailConfig.isActive ? 'success' : 'muted'}>
                  {emailConfig.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>Incoming mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Host</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.imapHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.imapPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security</span>
                  <Badge variant={emailConfig.imapTls ? 'success' : 'secondary'}>
                    {emailConfig.imapTls ? 'TLS' : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="text-apptax-navy font-medium">{emailConfig.imapUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <Lock className="text-apptax-teal h-3 w-3" />
                    <span className="text-muted-foreground text-xs">Encrypted</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-apptax-soft-teal border-apptax-blue/20 md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-apptax-blue/10 rounded p-2">
                  <Mail className="text-apptax-blue h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-apptax-navy font-semibold">
                    {emailConfig.displayName || 'Email Configuration Active'}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Your email configuration is active and ready to use. Passwords are securely
                    encrypted and stored. Last updated:{' '}
                    {new Date(emailConfig.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form Dialog */}
      <EmailConfigFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        config={hasConfig ? emailConfig : undefined}
        onSubmit={handleSubmit}
        type="user"
        onTestSmtp={(data) => testSmtp.mutate(data)}
        onTestImap={(data) => testImap.mutate(data)}
        isTestingSmtp={testSmtp.isPending}
        isTestingImap={testImap.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Email Configuration"
        description="Are you sure you want to delete your email configuration? This action cannot be undone and you will need to reconfigure your email settings."
        confirmText="Delete Configuration"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
