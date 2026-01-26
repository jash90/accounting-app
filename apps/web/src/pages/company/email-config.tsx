import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { AlertCircle, Building2, Edit, Lock, Plus, Server, Trash2 } from 'lucide-react';
import {
  useCompanyEmailConfig,
  useCreateCompanyEmailConfig,
  useDeleteCompanyEmailConfig,
  useTestCompanyImap,
  useTestCompanySmtp,
  useUpdateCompanyEmailConfig,
} from '@/lib/hooks/use-email-config';
import {
  type CreateEmailConfigFormData,
  type UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';
import { EmailConfigFormDialog } from '@/components/forms/email-config-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

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
                <Edit className="mr-2 h-4 w-4" />
                Edytuj konfigurację
              </Button>
              <Button onClick={() => setDeleteOpen(true)} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </Button>
            </div>
          ) : (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Utwórz konfigurację
            </Button>
          )
        }
      />

      {/* Important Notice */}
      <Card className="border-primary bg-accent/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded p-2">
              <AlertCircle className="text-primary h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-foreground font-semibold">Konfiguracja email dla całej firmy</h4>
              <p className="text-muted-foreground text-sm">
                Ta konfiguracja email będzie używana do wszystkich komunikacji firmowych,
                powiadomień i automatycznych wiadomości wysyłanych w imieniu Twojej organizacji.
                Tylko właściciele firmy mogą zarządzać tą konfiguracją.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div className="bg-accent/10 rounded-full p-4">
                <Building2 className="text-primary h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-lg font-semibold">
                  Brak konfiguracji email firmy
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Twoja firma nie ma jeszcze skonfigurowanych ustawień email. Utwórz konfigurację,
                  aby umożliwić komunikację email i automatyczne powiadomienia w całej firmie.
                </p>
              </div>
              <Button onClick={() => setFormOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
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
              <div className="bg-destructive/10 rounded p-2">
                <Building2 className="text-destructive h-5 w-5" />
              </div>
              <div>
                <h3 className="text-destructive font-semibold">Błąd ładowania konfiguracji</h3>
                <p className="text-muted-foreground text-sm">
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
                  <Server className="text-primary h-5 w-5" />
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
                  <span className="text-foreground font-medium">{emailConfig.smtpHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="text-foreground font-medium">{emailConfig.smtpPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zabezpieczenia</span>
                  <Badge variant={emailConfig.smtpSecure ? 'success' : 'secondary'}>
                    {emailConfig.smtpSecure ? 'SSL/TLS' : 'Brak'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Użytkownik</span>
                  <span className="text-foreground font-medium">{emailConfig.smtpUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hasło</span>
                  <div className="flex items-center gap-2">
                    <Lock className="text-accent h-3 w-3" />
                    <span className="text-muted-foreground text-xs">Zaszyfrowane</span>
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
                  <Server className="text-accent h-5 w-5" />
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
                  <span className="text-foreground font-medium">{emailConfig.imapHost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Port</span>
                  <span className="text-foreground font-medium">{emailConfig.imapPort}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zabezpieczenia</span>
                  <Badge variant={emailConfig.imapTls ? 'success' : 'secondary'}>
                    {emailConfig.imapTls ? 'TLS' : 'Brak'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Użytkownik</span>
                  <span className="text-foreground font-medium">{emailConfig.imapUser}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hasło</span>
                  <div className="flex items-center gap-2">
                    <Lock className="text-accent h-3 w-3" />
                    <span className="text-muted-foreground text-xs">Zaszyfrowane</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="from-accent/10 to-accent/5 bg-gradient-to-r md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded bg-white p-2">
                  <Building2 className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-foreground font-semibold">
                    {emailConfig.displayName || 'Konfiguracja email firmy aktywna'}
                  </h4>
                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p>
                      Konfiguracja email Twojej firmy jest aktywna i zabezpieczona szyfrowaniem. Ta
                      konfiguracja jest używana do wszystkich operacji email w całej firmie.
                    </p>
                    {emailConfig.company && (
                      <p className="text-foreground font-medium">
                        Firma: {emailConfig.company.name}
                      </p>
                    )}
                    <p>
                      Ostatnia aktualizacja:{' '}
                      {new Date(emailConfig.updatedAt).toLocaleDateString('pl-PL')}
                    </p>
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
        onSubmit={(data) => {
          if (hasConfig) {
            handleUpdate(data as UpdateEmailConfigFormData);
          } else {
            handleCreate(data as CreateEmailConfigFormData);
          }
        }}
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
