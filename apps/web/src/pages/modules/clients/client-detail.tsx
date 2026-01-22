import { useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  Edit,
  User,
  Building2,
  Calendar,
  FileText,
  Tags,
  AlertTriangle,
} from 'lucide-react';

import { ClientChangelog } from '@/components/clients/client-changelog';
import { ClientTaskStatistics } from '@/components/clients/client-task-statistics';
import { ClientTasksList } from '@/components/clients/client-tasks-list';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ClientFormDialog } from '@/components/forms/client-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useFieldDefinitions,
  useClientIcons,
  useClient,
  useUpdateClient,
  useSetClientCustomFields,
} from '@/lib/hooks/use-clients';
import { type UpdateClientDto } from '@/types/dtos';
import { type ClientIcon } from '@/types/entities';
import {
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  UserRole,
} from '@/types/enums';

function formatDate(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL');
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-apptax-navy font-medium">{value || '-'}</p>
    </div>
  );
}

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

  const [editOpen, setEditOpen] = useState(false);

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
            <h1 className="text-apptax-navy flex items-center gap-2 text-2xl font-bold">
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
          <Button
            onClick={() => setEditOpen(true)}
            className="bg-apptax-blue hover:bg-apptax-blue/90"
          >
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
                      <a
                        href={`mailto:${client.email}`}
                        className="text-apptax-blue hover:underline"
                      >
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
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <InfoItem
                  label="Data rozpoczęcia firmy"
                  value={formatDate(client.companyStartDate)}
                />
                <InfoItem
                  label="Data rozpoczęcia współpracy"
                  value={formatDate(client.cooperationStartDate)}
                />
                <InfoItem label="Data zawieszenia" value={formatDate(client.suspensionDate)} />
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
                  <p className="text-apptax-navy whitespace-pre-wrap">
                    {client.companySpecificity}
                  </p>
                </div>
              )}
              {client.additionalInfo && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm">Dodatkowe uwagi</p>
                  <p className="text-apptax-navy whitespace-pre-wrap">{client.additionalInfo}</p>
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
          onSubmit={async (data, customFields) => {
            updateClient.mutate(
              {
                id: client.id,
                data: data as UpdateClientDto,
              },
              {
                onSuccess: async () => {
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
