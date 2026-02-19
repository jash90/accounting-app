import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  TrendingUp,
  User,
  UserCheck,
} from 'lucide-react';

import { LeadFormDialog } from '@/components/forms/lead-form-dialog';
import { OfferFormDialog } from '@/components/forms/offer-form-dialog';
import { LeadStatusBadge } from '@/components/offers/lead-status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useConvertLeadToClient,
  useCreateOffer,
  useLead,
  useUpdateLead,
} from '@/lib/hooks/use-offers';
import { type CreateLeadFormData, type UpdateLeadFormData } from '@/lib/validation/schemas';
import { type CreateOfferDto, type UpdateLeadDto } from '@/types/dtos';
import { LeadSourceLabels, LeadStatus, LeadStatusLabels } from '@/types/enums';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('offers');

  const { data: lead, isPending } = useLead(id || '');

  const updateMutation = useUpdateLead();
  const convertMutation = useConvertLeadToClient();
  const createOfferMutation = useCreateOffer();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);

  if (isPending) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto p-6">
        <p>Prospekt nie został znaleziony.</p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    await updateMutation.mutateAsync({ id: lead.id, data: { status: newStatus } });
  };

  const handleUpdateLead = async (data: CreateLeadFormData | UpdateLeadFormData) => {
    await updateMutation.mutateAsync({ id: lead.id, data: data as UpdateLeadDto });
    setIsEditDialogOpen(false);
  };

  const handleConvert = async () => {
    const result = await convertMutation.mutateAsync({ id: lead.id });
    setIsConvertDialogOpen(false);
    if (result.clientId) {
      // Optionally navigate to client
    }
  };

  const handleCreateOffer = async (data: unknown) => {
    await createOfferMutation.mutateAsync(data as CreateOfferDto);
    setIsOfferDialogOpen(false);
  };

  const statusOptions = Object.values(LeadStatus);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/leads`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-apptax-navy text-2xl font-bold">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            {lead.nip && <p className="text-muted-foreground">NIP: {lead.nip}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={lead.status}
            onValueChange={(v) => handleStatusChange(v as LeadStatus)}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {LeadStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          {lead.status !== LeadStatus.CONVERTED && lead.status !== LeadStatus.LOST && (
            <>
              <Button variant="outline" onClick={() => setIsOfferDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Utwórz ofertę
              </Button>
              <Button
                onClick={() => setIsConvertDialogOpen(true)}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Przekonwertuj
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dane firmy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-sm">Nazwa firmy</div>
                  <div className="font-medium">{lead.name}</div>
                </div>
                {lead.nip && (
                  <div>
                    <div className="text-muted-foreground text-sm">NIP</div>
                    <div className="font-medium">{lead.nip}</div>
                  </div>
                )}
                {lead.regon && (
                  <div>
                    <div className="text-muted-foreground text-sm">REGON</div>
                    <div className="font-medium">{lead.regon}</div>
                  </div>
                )}
              </div>

              {(lead.street || lead.city || lead.postalCode) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <div className="text-muted-foreground text-sm">Adres</div>
                      <div className="font-medium">
                        {[lead.street, lead.postalCode, lead.city].filter(Boolean).join(', ')}
                      </div>
                      {lead.country && lead.country !== 'Polska' && (
                        <div className="text-muted-foreground text-sm">{lead.country}</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dane kontaktowe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.contactPerson && (
                <div>
                  <div className="text-muted-foreground text-sm">Osoba kontaktowa</div>
                  <div className="font-medium">
                    {lead.contactPerson}
                    {lead.contactPosition && (
                      <span className="text-muted-foreground"> - {lead.contactPosition}</span>
                    )}
                  </div>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <div>
                    <div className="text-muted-foreground text-sm">Email</div>
                    <a href={`mailto:${lead.email}`} className="text-apptax-blue hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <div>
                    <div className="text-muted-foreground text-sm">Telefon</div>
                    <a href={`tel:${lead.phone}`} className="text-apptax-blue hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}
              {!lead.contactPerson && !lead.email && !lead.phone && (
                <p className="text-muted-foreground text-sm">Brak danych kontaktowych</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notatki</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Szczegóły</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.source && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Źródło</span>
                    <span className="font-medium">{LeadSourceLabels[lead.source]}</span>
                  </div>
                  <Separator />
                </>
              )}
              {lead.estimatedValue !== undefined && lead.estimatedValue !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Szacowana wartość
                    </span>
                    <span className="font-semibold text-green-600">
                      {Number(lead.estimatedValue).toFixed(2)} PLN
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              {lead.assignedTo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Przypisany do</span>
                    <span className="font-medium">
                      {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Utworzono
                </span>
                <span className="font-medium">
                  {new Date(lead.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>
              {lead.createdBy && (
                <div className="text-muted-foreground text-right text-sm">
                  Przez: {lead.createdBy.firstName} {lead.createdBy.lastName}
                </div>
              )}
              {lead.convertedAt && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Przekonwertowano</span>
                    <span className="font-medium text-green-600">
                      {new Date(lead.convertedAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
              <CardDescription>Wykonaj typowe operacje na tym prospekcie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Wyślij email
                  </a>
                </Button>
              )}
              {lead.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Zadzwoń
                  </a>
                </Button>
              )}
              {lead.status !== LeadStatus.CONVERTED && lead.status !== LeadStatus.LOST && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsOfferDialogOpen(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Utwórz ofertę
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <LeadFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        lead={lead}
        onSubmit={handleUpdateLead}
      />

      <OfferFormDialog
        open={isOfferDialogOpen}
        onOpenChange={setIsOfferDialogOpen}
        onSubmit={handleCreateOffer}
        preselectedLeadId={lead.id}
      />

      <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Przekonwertuj prospekt na klienta</AlertDialogTitle>
            <AlertDialogDescription>
              Prospekt &quot;{lead.name}&quot; zostanie przekonwertowany na klienta. Dane prospektu
              zostaną skopiowane do nowego rekordu klienta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="bg-apptax-blue hover:bg-apptax-blue/90"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {convertMutation.isPending ? 'Konwertowanie...' : 'Przekonwertuj'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
