import { useParams, useNavigate } from 'react-router-dom';
import { useClient, useUpdateClient, useSetClientIcons, useSetClientCustomFields } from '@/lib/hooks/use-clients';
import { useFieldDefinitions, useClientIcons } from '@/lib/hooks/use-clients';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  User,
  Building2,
  Calendar,
  Mail,
  Phone,
  FileText,
  Tags,
  History,
} from 'lucide-react';
import { useState } from 'react';
import { ClientFormDialog } from '@/components/forms/client-form-dialog';
import { ClientChangelog } from '@/components/clients/client-changelog';
import { UpdateClientDto } from '@/types/dtos';
import { EmploymentType, VatStatus, TaxScheme, ZusStatus } from '@/types/enums';

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.DG]: 'DG',
  [EmploymentType.DG_ETAT]: 'DG + Etat',
  [EmploymentType.DG_AKCJONARIUSZ]: 'DG Akcjonariusz',
  [EmploymentType.DG_HALF_TIME_BELOW_MIN]: 'DG 1/2 etatu poniżej min.',
  [EmploymentType.DG_HALF_TIME_ABOVE_MIN]: 'DG 1/2 etatu powyżej min.',
};

const VAT_STATUS_LABELS: Record<VatStatus, string> = {
  [VatStatus.VAT_MONTHLY]: 'VAT miesięczny',
  [VatStatus.VAT_QUARTERLY]: 'VAT kwartalny',
  [VatStatus.NO]: 'Nie',
  [VatStatus.NO_WATCH_LIMIT]: 'Nie (obserwuj limit)',
};

const TAX_SCHEME_LABELS: Record<TaxScheme, string> = {
  [TaxScheme.PIT_17]: 'PIT 17%',
  [TaxScheme.PIT_19]: 'PIT 19%',
  [TaxScheme.LUMP_SUM]: 'Ryczałt',
  [TaxScheme.GENERAL]: 'Zasady ogólne',
};

const ZUS_STATUS_LABELS: Record<ZusStatus, string> = {
  [ZusStatus.FULL]: 'Pełny',
  [ZusStatus.PREFERENTIAL]: 'Preferencyjny',
  [ZusStatus.NONE]: 'Brak',
};

function formatDate(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL');
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-apptax-navy">{value || '-'}</p>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isPending, error } = useClient(id!);
  const { data: fieldDefinitions = [] } = useFieldDefinitions();
  const { data: icons = [] } = useClientIcons();
  const updateClient = useUpdateClient();

  const [editOpen, setEditOpen] = useState(false);

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
        <Button variant="ghost" onClick={() => navigate('/modules/clients')}>
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

  // Get assigned icons
  const assignedIcons = client.iconAssignments?.map((assignment) => {
    const icon = icons.find((i) => i.id === assignment.iconId);
    return icon;
  }).filter(Boolean) || [];

  // Get custom field values
  const customFieldValues = client.customFieldValues || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/modules/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-apptax-navy flex items-center gap-2">
              {client.name}
              {!client.isActive && (
                <Badge variant="outline" className="ml-2">
                  Nieaktywny
                </Badge>
              )}
            </h1>
            {client.nip && (
              <p className="text-muted-foreground font-mono">NIP: {client.nip}</p>
            )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dane podstawowe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InfoItem
                  label="Forma zatrudnienia"
                  value={
                    client.employmentType ? (
                      <Badge variant="secondary">
                        {EMPLOYMENT_TYPE_LABELS[client.employmentType]}
                      </Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Status VAT"
                  value={
                    client.vatStatus ? (
                      <Badge variant="default">
                        {VAT_STATUS_LABELS[client.vatStatus]}
                      </Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Forma opodatkowania"
                  value={
                    client.taxScheme ? (
                      <Badge variant="secondary">
                        {TAX_SCHEME_LABELS[client.taxScheme]}
                      </Badge>
                    ) : null
                  }
                />
                <InfoItem
                  label="Status ZUS"
                  value={
                    client.zusStatus ? (
                      <Badge variant="secondary">
                        {ZUS_STATUS_LABELS[client.zusStatus]}
                      </Badge>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InfoItem
                  label="Data rozpoczęcia firmy"
                  value={formatDate(client.companyStartDate)}
                />
                <InfoItem
                  label="Data rozpoczęcia współpracy"
                  value={formatDate(client.cooperationStartDate)}
                />
                <InfoItem
                  label="Data zawieszenia"
                  value={formatDate(client.suspensionDate)}
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
              <div className="grid grid-cols-2 gap-6 mb-6">
                <InfoItem label="Kod GTU" value={client.gtuCode} />
                <InfoItem label="Grupa AML" value={client.amlGroup} />
              </div>
              {client.companySpecificity && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Specyfika firmy
                  </p>
                  <p className="text-apptax-navy whitespace-pre-wrap">
                    {client.companySpecificity}
                  </p>
                </div>
              )}
              {client.additionalInfo && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Dodatkowe uwagi
                  </p>
                  <p className="text-apptax-navy whitespace-pre-wrap">
                    {client.additionalInfo}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                        style={{
                          borderColor: icon.color || '#e5e7eb',
                          backgroundColor: icon.color
                            ? `${icon.color}10`
                            : 'transparent',
                        }}
                      >
                        {icon.filePath && (
                          <img
                            src={icon.filePath}
                            alt={icon.name}
                            className="w-4 h-4"
                          />
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

        <div>
          <ClientChangelog clientId={id!} />
        </div>
      </div>

      {editOpen && client && (
        <ClientFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          client={client}
          onSubmit={(data) => {
            updateClient.mutate({
              id: client.id,
              data: data as UpdateClientDto,
            });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
