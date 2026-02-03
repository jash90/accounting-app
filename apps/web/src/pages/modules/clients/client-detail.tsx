import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  FileText,
  Tags,
  User,
} from 'lucide-react';

import { ClientChangelog } from '@/components/clients/client-changelog';
import { ClientTaskStatistics } from '@/components/clients/client-task-statistics';
import { ClientTasksList } from '@/components/clients/client-tasks-list';
import { ReliefPeriodsCard } from '@/components/clients/relief-periods-card';
import { SuspensionHistoryCard } from '@/components/clients/suspension-history-card';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ClientFormDialog, type ClientReliefsData } from '@/components/forms/client-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoItem } from '@/components/ui/info-item';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useClient,
  useClientIcons,
  useFieldDefinitions,
  useSetClientCustomFields,
  useUpdateClient,
} from '@/lib/hooks/use-clients';
import {
  ReliefType,
  useClientReliefPeriods,
  useCreateReliefPeriod,
  useDeleteReliefPeriod,
  useUpdateReliefPeriod,
} from '@/lib/hooks/use-relief-periods';
import { formatDate } from '@/lib/utils/format-date';
import { type UpdateClientDto } from '@/types/dtos';
import { type ClientIcon } from '@/types/entities';
import {
  EmploymentTypeLabels,
  TaxSchemeLabels,
  UserRole,
  VatStatusLabels,
  ZusStatusLabels,
} from '@/types/enums';

/**
 * Error fallback component for ClientDetailPage
 */
function ClientDetailErrorFallback() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <AlertTriangle className="text-destructive h-16 w-16" />
      <h2 className="text-xl font-semibold">Wystąpił błąd</h2>
      <p className="text-muted-foreground max-w-md text-center">
        Nie udało się załadować szczegółów klienta. Proszę odświeżyć stronę lub spróbować później.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
        <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <ErrorBoundary fallback={<ClientDetailErrorFallback />}>
      <ClientDetailContent />
    </ErrorBoundary>
  );
}

function ClientDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Guard against undefined id
  const clientId = id ?? '';
  const { data: client, isPending, error } = useClient(clientId);
  const { data: fieldDefinitionsResponse } = useFieldDefinitions();
  const fieldDefinitions = fieldDefinitionsResponse?.data ?? [];
  const { data: iconsResponse } = useClientIcons();
  const icons = iconsResponse?.data ?? [];
  const updateClient = useUpdateClient();
  const setCustomFields = useSetClientCustomFields();

  // Relief period hooks
  const { data: reliefPeriods } = useClientReliefPeriods(clientId);
  const createReliefPeriod = useCreateReliefPeriod();
  const updateReliefPeriod = useUpdateReliefPeriod();
  const deleteReliefPeriod = useDeleteReliefPeriod();

  const [editOpen, setEditOpen] = useState(false);

  // Handler for updating relief periods from the form dialog
  const handleReliefPeriodsUpdate = async (reliefs: ClientReliefsData) => {
    const existingUlgaNaStart = reliefPeriods?.find(
      (r) => r.reliefType === ReliefType.ULGA_NA_START
    );
    const existingMalyZus = reliefPeriods?.find((r) => r.reliefType === ReliefType.MALY_ZUS);

    try {
      // Handle Ulga na Start
      if (reliefs.ulgaNaStart) {
        if (existingUlgaNaStart) {
          // Update existing
          await updateReliefPeriod.mutateAsync({
            clientId,
            reliefId: existingUlgaNaStart.id,
            data: {
              startDate: reliefs.ulgaNaStart.startDate.split('T')[0],
              endDate: reliefs.ulgaNaStart.endDate?.split('T')[0],
            },
          });
        } else {
          // Create new
          await createReliefPeriod.mutateAsync({
            clientId,
            data: {
              reliefType: ReliefType.ULGA_NA_START,
              startDate: reliefs.ulgaNaStart.startDate.split('T')[0],
              endDate: reliefs.ulgaNaStart.endDate?.split('T')[0],
            },
          });
        }
      } else if (existingUlgaNaStart) {
        // Delete if it was disabled
        await deleteReliefPeriod.mutateAsync({
          clientId,
          reliefId: existingUlgaNaStart.id,
        });
      }

      // Handle Mały ZUS
      if (reliefs.malyZus) {
        if (existingMalyZus) {
          // Update existing
          await updateReliefPeriod.mutateAsync({
            clientId,
            reliefId: existingMalyZus.id,
            data: {
              startDate: reliefs.malyZus.startDate.split('T')[0],
              endDate: reliefs.malyZus.endDate?.split('T')[0],
            },
          });
        } else {
          // Create new
          await createReliefPeriod.mutateAsync({
            clientId,
            data: {
              reliefType: ReliefType.MALY_ZUS,
              startDate: reliefs.malyZus.startDate.split('T')[0],
              endDate: reliefs.malyZus.endDate?.split('T')[0],
            },
          });
        }
      } else if (existingMalyZus) {
        // Delete if it was disabled
        await deleteReliefPeriod.mutateAsync({
          clientId,
          reliefId: existingMalyZus.id,
        });
      }
    } catch (error) {
      console.error('Failed to update relief periods:', error);
      // Error notification handled by mutation's onError
    }
  };

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/clients';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/clients';
      default:
        return '/modules/clients';
    }
  };

  const basePath = getBasePath();

  // Handle missing id
  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="text-destructive text-2xl font-semibold">Błąd</h1>
        <p className="text-muted-foreground mt-2">Nie podano identyfikatora klienta</p>
        <Button onClick={() => navigate(basePath)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Nie znaleziono klienta</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get assigned icons - use type predicate to properly narrow the type
  const assignedIcons =
    client.iconAssignments
      ?.map((assignment) => {
        return icons.find((i) => i.id === assignment.iconId);
      })
      .filter((icon): icon is ClientIcon => icon !== undefined) ?? [];

  // Get custom field values
  const customFieldValues = client.customFieldValues || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do listy
          </Button>
          <div>
            <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold">
              {client.name}
              {!client.isActive && (
                <Badge variant="outline" className="ml-2">
                  Nieaktywny
                </Badge>
              )}
            </h1>
            {client.nip && <p className="text-muted-foreground font-mono">NIP: {client.nip}</p>}
          </div>
        </div>

        {client.isActive && (
          <Button onClick={() => setEditOpen(true)} className="bg-primary hover:bg-primary/90">
            <Edit className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dane podstawowe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <InfoItem label="Nazwa" value={client.name} />
                <InfoItem label="NIP" value={client.nip} />
                <InfoItem
                  label="Email"
                  value={
                    client.email ? (
                      <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                        {client.email}
                      </a>
                    ) : null
                  }
                />
                <InfoItem label="Telefon" value={client.phone} />
              </div>
            </CardContent>
          </Card>

          {/* Tax and Employment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Podatki i zatrudnienie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <InfoItem
                  label="Forma zatrudnienia"
                  value={
                    client.employmentType ? (
                      <Badge variant="secondary">
                        {EmploymentTypeLabels[client.employmentType]}
                      </Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Status VAT"
                  value={
                    client.vatStatus ? (
                      <Badge variant="default">{VatStatusLabels[client.vatStatus]}</Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Forma opodatkowania"
                  value={
                    client.taxScheme ? (
                      <Badge variant="secondary">{TaxSchemeLabels[client.taxScheme]}</Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Status ZUS"
                  value={
                    client.zusStatus ? (
                      <Badge variant="secondary">{ZusStatusLabels[client.zusStatus]}</Badge>
                    ) : null
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <InfoItem
                  label="Data rozpoczęcia firmy"
                  value={formatDate(client.companyStartDate)}
                />
                <InfoItem
                  label="Data rozpoczęcia współpracy"
                  value={formatDate(client.cooperationStartDate)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dodatkowe informacje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 gap-6">
                <InfoItem label="Kod GTU" value={client.gtuCode} />
                <InfoItem label="Grupa AML" value={client.amlGroup} />
              </div>
              {client.companySpecificity && (
                <div className="mb-4">
                  <p className="text-muted-foreground mb-1 text-sm">Specyfika firmy</p>
                  <p className="text-foreground whitespace-pre-wrap">{client.companySpecificity}</p>
                </div>
              )}
              {client.additionalInfo && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm">Dodatkowe uwagi</p>
                  <p className="text-foreground whitespace-pre-wrap">{client.additionalInfo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Tasks */}
          <ClientTasksList clientId={clientId} clientName={client.name} />

          {/* Custom Fields */}
          {customFieldValues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Pola niestandardowe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  {customFieldValues.map((cfv) => {
                    const definition = fieldDefinitions.find(
                      (fd) => fd.id === cfv.fieldDefinitionId
                    );
                    return (
                      <InfoItem
                        key={cfv.id}
                        label={definition?.label || 'Nieznane pole'}
                        value={cfv.value}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Icons */}
          {assignedIcons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Przypisane ikony
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {assignedIcons.map((icon) =>
                    icon ? (
                      <div
                        key={icon.id}
                        className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                        style={{
                          borderColor: icon.color || '#e5e7eb',
                          backgroundColor: icon.color ? `${icon.color}10` : 'transparent',
                        }}
                      >
                        {icon.filePath && (
                          <img src={icon.filePath} alt={icon.name} className="h-4 w-4" />
                        )}
                        <span className="text-sm">{icon.name}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <ClientTaskStatistics clientId={clientId} />
          <ReliefPeriodsCard clientId={clientId} />
          <SuspensionHistoryCard clientId={clientId} />
          <div id="changelog">
            <ClientChangelog clientId={id} />
          </div>
        </div>
      </div>

      {editOpen && client && (
        <ClientFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          client={client}
          existingReliefs={reliefPeriods?.map((r) => ({
            reliefType: r.reliefType as ReliefType,
            startDate: r.startDate,
            endDate: r.endDate,
          }))}
          onSubmit={async (data, customFields, reliefs) => {
            updateClient.mutate(
              {
                id: client.id,
                data: data as UpdateClientDto,
              },
              {
                onSuccess: async () => {
                  // Handle custom fields
                  if (customFields && Object.keys(customFields.values).length > 0) {
                    try {
                      await setCustomFields.mutateAsync({
                        id: client.id,
                        data: customFields,
                      });
                    } catch (error) {
                      console.error('Failed to update client custom fields:', error);
                      // Error notification handled by mutation's onError
                    }
                  }

                  // Handle relief periods
                  if (reliefs) {
                    await handleReliefPeriodsUpdate(reliefs);
                  }

                  setEditOpen(false);
                },
                onError: (error) => {
                  console.error('Failed to update client:', error);
                  // Error notification handled by mutation's onError
                },
              }
            );
          }}
        />
      )}
    </div>
  );
}
