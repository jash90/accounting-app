import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmailConfigFormDialog } from '@/components/forms/email-config-form-dialog';
import {
  useUserEmailConfig,
  useCreateUserEmailConfig,
  useUpdateUserEmailConfig,
  useDeleteUserEmailConfig,
} from '@/lib/hooks/use-email-config';
import { CreateEmailConfigFormData, UpdateEmailConfigFormData } from '@/lib/validation/schemas';
import { Mail, Edit, Trash2, Plus, Server, Lock } from 'lucide-react';

export default function UserEmailConfigPage() {
  const { data: emailConfig, isPending, isError, error } = useUserEmailConfig();
  const createConfig = useCreateUserEmailConfig();
  const updateConfig = useUpdateUserEmailConfig();
  const deleteConfig = useDeleteUserEmailConfig();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasConfig = !!emailConfig && !isError;

  const handleCreate = (data: CreateEmailConfigFormData) => {
    createConfig.mutate(data, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleUpdate = (data: UpdateEmailConfigFormData) => {
    updateConfig.mutate(data, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleDelete = () => {
    deleteConfig.mutate(undefined, {
      onSuccess: () => setDeleteOpen(false),
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
                <Edit className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
              <Button onClick={() => setDeleteOpen(true)} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          ) : (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Configuration
            </Button>
          )
        }
      />

      {/* Loading State */}
      {isPending && (
        <Card>
          <CardContent className="p-6 space-y-4">
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
              <div className="p-4 bg-apptax-soft-teal rounded-full">
                <Mail className="h-8 w-8 text-apptax-blue" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-apptax-navy">No Email Configuration</h3>
                <p className="text-muted-foreground max-w-md">
                  You haven't configured your email settings yet. Create a configuration to start sending and
                  receiving emails through the platform.
                </p>
              </div>
              <Button onClick={() => setFormOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
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
              <div className="p-2 bg-destructive/10 rounded">
                <Mail className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Error Loading Configuration</h3>
                <p className="text-sm text-muted-foreground">{error.message || 'Failed to load email configuration'}</p>
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
                  <Server className="h-5 w-5 text-apptax-blue" />
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
                  <span className="font-medium text-apptax-navy">{emailConfig.smtpHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.smtpPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security</span>
                  <Badge variant={emailConfig.smtpSecure ? 'success' : 'secondary'}>
                    {emailConfig.smtpSecure ? 'SSL/TLS' : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.smtpUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-apptax-teal" />
                    <span className="text-xs text-muted-foreground">Encrypted</span>
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
                  <Server className="h-5 w-5 text-apptax-teal" />
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
                  <span className="font-medium text-apptax-navy">{emailConfig.imapHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.imapPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security</span>
                  <Badge variant={emailConfig.imapTls ? 'success' : 'secondary'}>
                    {emailConfig.imapTls ? 'TLS' : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.imapUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-apptax-teal" />
                    <span className="text-xs text-muted-foreground">Encrypted</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="md:col-span-2 bg-apptax-soft-teal border-apptax-blue/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-apptax-blue/10 rounded">
                  <Mail className="h-5 w-5 text-apptax-blue" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-apptax-navy">
                    {emailConfig.displayName || 'Email Configuration Active'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your email configuration is active and ready to use. Passwords are securely encrypted and stored.
                    Last updated: {new Date(emailConfig.updatedAt).toLocaleDateString()}
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
        onSubmit={hasConfig ? handleUpdate : handleCreate}
        type="user"
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
