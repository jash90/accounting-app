import { useState } from 'react';

import { AlertCircle, Edit, Lock, Mail, Plus, Server, Shield, Trash2, User } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { EmailConfigFormDialog } from '@/components/forms/email-config-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCreateSystemAdminEmailConfig,
  useCreateUserEmailConfig,
  useDeleteSystemAdminEmailConfig,
  useDeleteUserEmailConfig,
  useSystemAdminEmailConfig,
  useTestImap,
  useTestSmtp,
  useTestSystemAdminImap,
  useTestSystemAdminSmtp,
  useUpdateSystemAdminEmailConfig,
  useUpdateUserEmailConfig,
  useUserEmailConfig,
} from '@/lib/hooks/use-email-config';
import {
  type CreateEmailConfigFormData,
  type UpdateEmailConfigFormData,
} from '@/lib/validation/schemas';
import { type EmailConfigResponseDto } from '@/types/dtos';

// Reusable Email Config Display Component
function EmailConfigDisplay({
  emailConfig,
  isPending,
  isError,
  error,
  type,
  onEdit,
  onDelete,
  onCreate,
}: {
  emailConfig: EmailConfigResponseDto | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  type: 'user' | 'system-admin';
  onEdit: () => void;
  onDelete: () => void;
  onCreate: () => void;
}) {
  const hasConfig = !!emailConfig && !isError;
  const Icon = type === 'system-admin' ? Shield : Mail;
  const title = type === 'system-admin' ? 'System Admin Email' : 'Personal Email';

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end">
        {hasConfig ? (
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="secondary" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edytuj konfigurację
            </Button>
            <Button onClick={onDelete} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </Button>
          </div>
        ) : (
          <Button onClick={onCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Utwórz konfigurację
          </Button>
        )}
      </div>

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
      {isError && (error as { response?: { status?: number } })?.response?.status === 404 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-accent/10 rounded-full p-4">
                <Icon className="text-primary h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-lg font-semibold">Brak konfiguracji {title}</h3>
                <p className="text-muted-foreground max-w-md">
                  {type === 'system-admin'
                    ? 'Konfiguracja email System Admin nie została jeszcze utworzona. Utwórz ją, aby umożliwić komunikację email dla wszystkich administratorów.'
                    : 'Nie masz jeszcze skonfigurowanego osobistego email. Utwórz konfigurację, aby móc wysyłać i odbierać wiadomości.'}
                </p>
              </div>
              <Button onClick={onCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Utwórz konfigurację {title}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State - Other Errors */}
      {isError && (error as { response?: { status?: number } })?.response?.status !== 404 && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 rounded p-2">
                <Icon className="text-destructive h-5 w-5" />
              </div>
              <div>
                <h3 className="text-destructive font-semibold">Błąd ładowania konfiguracji</h3>
                <p className="text-muted-foreground text-sm">
                  {error?.message || 'Nie udało się załadować konfiguracji email'}
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
          <Card className="bg-accent/10 border-primary/20 md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded p-2">
                  <Icon className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-foreground font-semibold">
                    {emailConfig.displayName || `Konfiguracja ${title} aktywna`}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {type === 'system-admin'
                      ? 'Ta konfiguracja email jest współdzielona przez wszystkich administratorów systemu. Wszystkie hasła są bezpiecznie zaszyfrowane.'
                      : 'Twoja osobista konfiguracja email jest aktywna i gotowa do użycia. Hasła są bezpiecznie zaszyfrowane.'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Ostatnia aktualizacja:{' '}
                    {new Date(emailConfig.updatedAt).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function AdminEmailConfigPage() {
  // User email config state
  const userConfig = useUserEmailConfig();
  const createUserConfig = useCreateUserEmailConfig();
  const updateUserConfig = useUpdateUserEmailConfig();
  const deleteUserConfig = useDeleteUserEmailConfig();
  const testSmtp = useTestSmtp();
  const testImap = useTestImap();

  // System Admin email config state
  const systemAdminConfig = useSystemAdminEmailConfig();
  const createSystemAdminConfig = useCreateSystemAdminEmailConfig();
  const updateSystemAdminConfig = useUpdateSystemAdminEmailConfig();
  const deleteSystemAdminConfig = useDeleteSystemAdminEmailConfig();
  const testSystemAdminSmtp = useTestSystemAdminSmtp();
  const testSystemAdminImap = useTestSystemAdminImap();

  // UI state
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userDeleteOpen, setUserDeleteOpen] = useState(false);
  const [systemAdminFormOpen, setSystemAdminFormOpen] = useState(false);
  const [systemAdminDeleteOpen, setSystemAdminDeleteOpen] = useState(false);

  const hasUserConfig = !!userConfig.data && !userConfig.isError;
  const hasSystemAdminConfig = !!systemAdminConfig.data && !systemAdminConfig.isError;

  // User config handlers
  const handleUserCreate = (data: CreateEmailConfigFormData) => {
    createUserConfig.mutate(data, {
      onSuccess: () => setUserFormOpen(false),
    });
  };

  const handleUserUpdate = (data: UpdateEmailConfigFormData) => {
    updateUserConfig.mutate(data, {
      onSuccess: () => setUserFormOpen(false),
    });
  };

  const handleUserDelete = () => {
    deleteUserConfig.mutate(undefined, {
      onSuccess: () => setUserDeleteOpen(false),
    });
  };

  // System Admin config handlers
  const handleSystemAdminCreate = (data: CreateEmailConfigFormData) => {
    createSystemAdminConfig.mutate(data, {
      onSuccess: () => setSystemAdminFormOpen(false),
    });
  };

  const handleSystemAdminUpdate = (data: UpdateEmailConfigFormData) => {
    updateSystemAdminConfig.mutate(data, {
      onSuccess: () => setSystemAdminFormOpen(false),
    });
  };

  const handleSystemAdminDelete = () => {
    deleteSystemAdminConfig.mutate(undefined, {
      onSuccess: () => setSystemAdminDeleteOpen(false),
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Konfiguracja Email"
        description="Zarządzaj swoją osobistą konfiguracją email oraz współdzieloną konfiguracją dla administratorów"
        icon={<Mail className="h-6 w-6" />}
      />

      {/* Important Notice */}
      <Card className="border-primary bg-accent/10/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded p-2">
              <AlertCircle className="text-primary h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-foreground font-semibold">Dwie konfiguracje email</h4>
              <p className="text-muted-foreground text-sm">
                Jako administrator masz dostęp do dwóch konfiguracji email:
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>
                  <strong>Mój email</strong> - Twoja osobista konfiguracja email
                </li>
                <li>
                  <strong>Email System Admin</strong> - Współdzielona konfiguracja dla wszystkich
                  administratorów systemu
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mój email
          </TabsTrigger>
          <TabsTrigger value="system-admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Email System Admin
          </TabsTrigger>
        </TabsList>

        {/* User Email Tab */}
        <TabsContent value="user">
          <EmailConfigDisplay
            emailConfig={userConfig.data}
            isPending={userConfig.isPending}
            isError={userConfig.isError}
            error={userConfig.error}
            type="user"
            onEdit={() => setUserFormOpen(true)}
            onDelete={() => setUserDeleteOpen(true)}
            onCreate={() => setUserFormOpen(true)}
          />
        </TabsContent>

        {/* System Admin Email Tab */}
        <TabsContent value="system-admin">
          <EmailConfigDisplay
            emailConfig={systemAdminConfig.data}
            isPending={systemAdminConfig.isPending}
            isError={systemAdminConfig.isError}
            error={systemAdminConfig.error}
            type="system-admin"
            onEdit={() => setSystemAdminFormOpen(true)}
            onDelete={() => setSystemAdminDeleteOpen(true)}
            onCreate={() => setSystemAdminFormOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* User Form Dialog */}
      <EmailConfigFormDialog
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        config={hasUserConfig ? userConfig.data : undefined}
        onSubmit={(data) => {
          if (hasUserConfig) {
            handleUserUpdate(data as UpdateEmailConfigFormData);
          } else {
            handleUserCreate(data as CreateEmailConfigFormData);
          }
        }}
        type="user"
        onTestSmtp={(data) => testSmtp.mutate(data)}
        onTestImap={(data) => testImap.mutate(data)}
        isTestingSmtp={testSmtp.isPending}
        isTestingImap={testImap.isPending}
      />

      {/* User Delete Confirmation */}
      <ConfirmDialog
        open={userDeleteOpen}
        onOpenChange={setUserDeleteOpen}
        title="Usuń osobistą konfigurację email"
        description="Czy na pewno chcesz usunąć swoją osobistą konfigurację email? Ta akcja nie może być cofnięta i będziesz musiał ponownie skonfigurować ustawienia."
        confirmText="Usuń konfigurację"
        onConfirm={handleUserDelete}
        variant="destructive"
      />

      {/* System Admin Form Dialog */}
      <EmailConfigFormDialog
        open={systemAdminFormOpen}
        onOpenChange={setSystemAdminFormOpen}
        config={hasSystemAdminConfig ? systemAdminConfig.data : undefined}
        onSubmit={(data) => {
          if (hasSystemAdminConfig) {
            handleSystemAdminUpdate(data as UpdateEmailConfigFormData);
          } else {
            handleSystemAdminCreate(data as CreateEmailConfigFormData);
          }
        }}
        type="system-admin"
        onTestSmtp={(data) => testSystemAdminSmtp.mutate(data)}
        onTestImap={(data) => testSystemAdminImap.mutate(data)}
        isTestingSmtp={testSystemAdminSmtp.isPending}
        isTestingImap={testSystemAdminImap.isPending}
      />

      {/* System Admin Delete Confirmation */}
      <ConfirmDialog
        open={systemAdminDeleteOpen}
        onOpenChange={setSystemAdminDeleteOpen}
        title="Usuń konfigurację email System Admin"
        description="Czy na pewno chcesz usunąć współdzieloną konfigurację email System Admin? Ta akcja wpłynie na wszystkich administratorów systemu i nie może być cofnięta."
        confirmText="Usuń konfigurację"
        onConfirm={handleSystemAdminDelete}
        variant="destructive"
      />
    </div>
  );
}
