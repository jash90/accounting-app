import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmailConfigFormDialog } from '@/components/forms/email-config-form-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useCompanyEmailConfig,
  useCreateCompanyEmailConfig,
  useUpdateCompanyEmailConfig,
  useDeleteCompanyEmailConfig,
  useTestCompanySmtp,
  useTestCompanyImap,
} from '@/lib/hooks/use-email-config';
import { CreateEmailConfigFormData, UpdateEmailConfigFormData } from '@/lib/validation/schemas';
import { Building2, Edit, Trash2, Plus, Server, Lock, AlertCircle } from 'lucide-react';

export default function CompanyEmailConfigPage() {
  const { data: emailConfig, isPending, isError, error } = useCompanyEmailConfig();
  const createConfig = useCreateCompanyEmailConfig();
  const updateConfig = useUpdateCompanyEmailConfig();
  const deleteConfig = useDeleteCompanyEmailConfig();
  const testSmtp = useTestCompanySmtp();
  const testImap = useTestCompanyImap();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasConfig = !!emailConfig && !isError;

  const handleCreate = (data: CreateEmailConfigFormData) => {
    createConfig.mutate(data, {
      onSuccess: () => setFormOpen(false),
      onError: (err: Error) => {
        toast({
          title: 'Error',
          description: err.message || 'Failed to create email configuration',
          variant: 'destructive',
        });
      },
    });
  };

  const handleUpdate = (data: UpdateEmailConfigFormData) => {
    updateConfig.mutate(data, {
      onSuccess: () => setFormOpen(false),
      onError: (err: Error) => {
        toast({
          title: 'Error',
          description: err.message || 'Failed to update email configuration',
          variant: 'destructive',
        });
      },
    });
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
        title="Konfiguracja email firmy"
        description="Zarządzaj ustawieniami email dla komunikacji firmowej"
        icon={<Building2 className="h-6 w-6" />}
        action={
          hasConfig ? (
            <div className="flex gap-2">
              <Button onClick={() => setFormOpen(true)} variant="secondary" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edytuj konfigurację
              </Button>
              <Button onClick={() => setDeleteOpen(true)} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
              </Button>
            </div>
          ) : (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Utwórz konfigurację
            </Button>
          )
        }
      />

      {/* Important Notice */}
      <Card className="border-apptax-blue bg-apptax-soft-teal/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-apptax-blue/10 rounded">
              <AlertCircle className="h-5 w-5 text-apptax-blue" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-apptax-navy">Konfiguracja email dla całej firmy</h4>
              <p className="text-sm text-muted-foreground">
                Ta konfiguracja email będzie używana do wszystkich komunikacji firmowych, powiadomień i automatycznych
                wiadomości wysyłanych w imieniu Twojej organizacji. Tylko właściciele firmy mogą zarządzać tą konfiguracją.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Building2 className="h-8 w-8 text-apptax-blue" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-apptax-navy">Brak konfiguracji email firmy</h3>
                <p className="text-muted-foreground max-w-md">
                  Twoja firma nie ma jeszcze skonfigurowanych ustawień email. Utwórz konfigurację, aby umożliwić
                  komunikację email i automatyczne powiadomienia w całej firmie.
                </p>
              </div>
              <Button onClick={() => setFormOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Utwórz konfigurację email firmy
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
                <Building2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Błąd ładowania konfiguracji</h3>
                <p className="text-sm text-muted-foreground">
                  {error.message || 'Nie udało się załadować konfiguracji email firmy'}
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
                  <Server className="h-5 w-5 text-apptax-blue" />
                  <CardTitle>Konfiguracja SMTP</CardTitle>
                </div>
                <Badge variant={emailConfig.isActive ? 'success' : 'muted'}>
                  {emailConfig.isActive ? 'Aktywna' : 'Nieaktywna'}
                </Badge>
              </div>
              <CardDescription>Ustawienia serwera poczty wychodzącej</CardDescription>
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
                  <span className="text-muted-foreground">Zabezpieczenia</span>
                  <Badge variant={emailConfig.smtpSecure ? 'success' : 'secondary'}>
                    {emailConfig.smtpSecure ? 'SSL/TLS' : 'Brak'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Użytkownik</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.smtpUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hasło</span>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-apptax-teal" />
                    <span className="text-xs text-muted-foreground">Zaszyfrowane</span>
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
                  <CardTitle>Konfiguracja IMAP</CardTitle>
                </div>
                <Badge variant={emailConfig.isActive ? 'success' : 'muted'}>
                  {emailConfig.isActive ? 'Aktywna' : 'Nieaktywna'}
                </Badge>
              </div>
              <CardDescription>Ustawienia serwera poczty przychodzącej</CardDescription>
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
                  <span className="text-muted-foreground">Zabezpieczenia</span>
                  <Badge variant={emailConfig.imapTls ? 'success' : 'secondary'}>
                    {emailConfig.imapTls ? 'TLS' : 'Brak'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Użytkownik</span>
                  <span className="font-medium text-apptax-navy">{emailConfig.imapUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hasło</span>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-apptax-teal" />
                    <span className="text-xs text-muted-foreground">Zaszyfrowane</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="md:col-span-2 bg-gradient-to-r from-apptax-soft-teal to-apptax-soft-teal/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded">
                  <Building2 className="h-5 w-5 text-apptax-blue" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-apptax-navy">
                    {emailConfig.displayName || 'Konfiguracja email firmy aktywna'}
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Konfiguracja email Twojej firmy jest aktywna i zabezpieczona szyfrowaniem. Ta konfiguracja jest używana
                      do wszystkich operacji email w całej firmie.
                    </p>
                    {emailConfig.company && (
                      <p className="font-medium text-apptax-navy">
                        Firma: {emailConfig.company.name}
                      </p>
                    )}
                    <p>Ostatnia aktualizacja: {new Date(emailConfig.updatedAt).toLocaleDateString('pl-PL')}</p>
                  </div>
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
        type="company"
        onTestSmtp={(data) => testSmtp.mutate(data)}
        onTestImap={(data) => testImap.mutate(data)}
        isTestingSmtp={testSmtp.isPending}
        isTestingImap={testImap.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Usuń konfigurację email firmy"
        description="Czy na pewno chcesz usunąć konfigurację email firmy? Wpłynie to na wszystkie operacje email w firmie i będziesz musiał ponownie ją skonfigurować."
        confirmText="Usuń konfigurację"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
