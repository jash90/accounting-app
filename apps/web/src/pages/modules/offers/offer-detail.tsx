import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  FileDown,
  FileText,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';

import { SendOfferDialog } from '@/components/forms/send-offer-dialog';
import { OfferStatusBadge } from '@/components/offers/offer-status-badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import {
  useDownloadOfferDocument,
  useDuplicateOffer,
  useGenerateOfferDocument,
  useOffer,
  useOfferActivities,
  useSendOffer,
  useUpdateOfferStatus,
} from '@/lib/hooks/use-offers';
import { type SendOfferDto } from '@/types/dtos';
import {
  OfferActivityType,
  OfferActivityTypeLabels,
  OfferStatus,
  OfferStatusLabels,
  VALID_OFFER_STATUS_TRANSITIONS,
} from '@/types/enums';

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('offers');

  const { data: offer, isPending } = useOffer(id || '');
  const { data: activities } = useOfferActivities(id || '');

  const updateStatusMutation = useUpdateOfferStatus();
  const generateDocMutation = useGenerateOfferDocument();
  const downloadDocMutation = useDownloadOfferDocument();
  const sendMutation = useSendOffer();
  const duplicateMutation = useDuplicateOffer();

  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [statusToChange, setStatusToChange] = useState<OfferStatus | null>(null);

  if (isPending) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="container mx-auto p-6">
        <p>Oferta nie została znaleziona.</p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: OfferStatus) => {
    if (newStatus === OfferStatus.ACCEPTED || newStatus === OfferStatus.REJECTED) {
      setStatusToChange(newStatus);
    } else {
      await updateStatusMutation.mutateAsync({ id: offer.id, data: { status: newStatus } });
    }
  };

  const confirmStatusChange = async () => {
    if (!statusToChange) return;
    await updateStatusMutation.mutateAsync({ id: offer.id, data: { status: statusToChange } });
    setStatusToChange(null);
  };

  const handleGenerateDocument = async () => {
    await generateDocMutation.mutateAsync(offer.id);
  };

  const handleDownloadDocument = async () => {
    if (!offer.generatedDocumentName) return;
    await downloadDocMutation.mutateAsync({
      id: offer.id,
      filename: offer.generatedDocumentName,
    });
  };

  const handleSendOffer = async (data: SendOfferDto) => {
    await sendMutation.mutateAsync({ id: offer.id, data });
    setIsSendDialogOpen(false);
  };

  const handleDuplicate = async () => {
    const result = await duplicateMutation.mutateAsync({ id: offer.id });
    if (result?.id) {
      navigate(`${basePath}/${result.id}`);
    }
  };

  const getActivityIcon = (type: OfferActivityType) => {
    switch (type) {
      case OfferActivityType.CREATED:
      case OfferActivityType.UPDATED:
        return <FileText className="h-4 w-4" />;
      case OfferActivityType.STATUS_CHANGED:
        return <Clock className="h-4 w-4" />;
      case OfferActivityType.DOCUMENT_GENERATED:
        return <FileDown className="h-4 w-4" />;
      case OfferActivityType.EMAIL_SENT:
        return <Send className="h-4 w-4" />;
      case OfferActivityType.VIEWED:
        return <CheckCircle className="h-4 w-4" />;
      case OfferActivityType.DUPLICATED:
        return <Copy className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const availableStatuses = VALID_OFFER_STATUS_TRANSITIONS[offer.status] || [];

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/list`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-apptax-navy text-2xl font-bold">{offer.offerNumber}</h1>
              <OfferStatusBadge status={offer.status} />
            </div>
            <p className="text-muted-foreground">{offer.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {availableStatuses.length > 0 && (
            <Select
              value={offer.status}
              onValueChange={(v) => handleStatusChange(v as OfferStatus)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={offer.status} disabled>
                  {OfferStatusLabels[offer.status]}
                </SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {OfferStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={handleGenerateDocument}
            disabled={generateDocMutation.isPending}
          >
            {offer.generatedDocumentPath ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {generateDocMutation.isPending
              ? 'Generowanie...'
              : offer.generatedDocumentPath
                ? 'Generuj ponownie'
                : 'Generuj dokument'}
          </Button>
          {offer.generatedDocumentPath && (
            <Button
              variant="outline"
              onClick={handleDownloadDocument}
              disabled={downloadDocMutation.isPending}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {downloadDocMutation.isPending ? 'Pobieranie...' : 'Pobierz'}
            </Button>
          )}
          {offer.status === OfferStatus.READY && (
            <Button
              onClick={() => setIsSendDialogOpen(true)}
              className="bg-apptax-blue hover:bg-apptax-blue/90"
            >
              <Send className="mr-2 h-4 w-4" />
              Wyślij
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            {duplicateMutation.isPending ? 'Duplikowanie...' : 'Duplikuj'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recipient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Odbiorca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg font-semibold">{offer.recipientSnapshot?.name ?? '-'}</div>
              {offer.recipientSnapshot?.nip && (
                <div className="text-muted-foreground text-sm">
                  NIP: {offer.recipientSnapshot.nip}
                </div>
              )}
              {(offer.recipientSnapshot?.street ||
                offer.recipientSnapshot?.city ||
                offer.recipientSnapshot?.postalCode) && (
                <div className="text-muted-foreground flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    {[
                      offer.recipientSnapshot?.street,
                      offer.recipientSnapshot?.postalCode,
                      offer.recipientSnapshot?.city,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {offer.recipientSnapshot?.email && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{offer.recipientSnapshot.email}</span>
                </div>
              )}
              {offer.recipientSnapshot?.phone && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{offer.recipientSnapshot.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Items */}
          {offer.serviceTerms && offer.serviceTerms.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pozycje usług</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead className="text-right">Cena jedn.</TableHead>
                      <TableHead className="text-right">Ilość</TableHead>
                      <TableHead className="text-right">Wartość netto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offer.serviceTerms.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>{item.name}</div>
                          {item.description && (
                            <div className="text-muted-foreground text-sm">{item.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.unitPrice).toFixed(2)} PLN
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit || 'szt.'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(item.netAmount).toFixed(2)} PLN
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Razem netto</TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(offer.totalNetAmount).toFixed(2)} PLN
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3}>VAT ({offer.vatRate}%)</TableCell>
                      <TableCell className="text-right">
                        {(Number(offer.totalGrossAmount) - Number(offer.totalNetAmount)).toFixed(2)}{' '}
                        PLN
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">
                        Razem brutto
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        {Number(offer.totalGrossAmount).toFixed(2)} PLN
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {offer.description && (
            <Card>
              <CardHeader>
                <CardTitle>Opis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{offer.description}</p>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data oferty</span>
                <span className="font-medium">
                  {new Date(offer.offerDate).toLocaleDateString('pl-PL')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ważna do</span>
                <span
                  className={`font-medium ${
                    new Date(offer.validUntil) < new Date() && offer.status !== OfferStatus.ACCEPTED
                      ? 'text-destructive'
                      : ''
                  }`}
                >
                  {new Date(offer.validUntil).toLocaleDateString('pl-PL')}
                </span>
              </div>
              {offer.template && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Szablon</span>
                    <span className="font-medium">{offer.template.name}</span>
                  </div>
                </>
              )}
              {offer.sentAt && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wysłano</span>
                    <span className="font-medium">
                      {new Date(offer.sentAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                  {offer.sentToEmail && (
                    <div className="text-muted-foreground text-sm">Na: {offer.sentToEmail}</div>
                  )}
                </>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Utworzono</span>
                <span className="font-medium">
                  {new Date(offer.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>
              {offer.createdBy && (
                <div className="text-muted-foreground text-sm">
                  Przez: {offer.createdBy.firstName} {offer.createdBy.lastName}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Historia aktywności</CardTitle>
              <CardDescription>Ostatnie zdarzenia związane z ofertą</CardDescription>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="bg-muted mt-0.5 rounded-full p-2">
                        {getActivityIcon(activity.activityType)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {OfferActivityTypeLabels[activity.activityType]}
                        </div>
                        {activity.description && (
                          <div className="text-muted-foreground text-sm">
                            {activity.description}
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          {new Date(activity.createdAt).toLocaleString('pl-PL')}
                          {activity.performedBy &&
                            ` • ${activity.performedBy.firstName} ${activity.performedBy.lastName}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Brak aktywności</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <SendOfferDialog
        open={isSendDialogOpen}
        onOpenChange={setIsSendDialogOpen}
        offer={offer}
        onSubmit={handleSendOffer}
        isLoading={sendMutation.isPending}
      />

      <AlertDialog open={!!statusToChange} onOpenChange={() => setStatusToChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToChange === OfferStatus.ACCEPTED ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Zaakceptować ofertę?
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Odrzucić ofertę?
                </span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusToChange === OfferStatus.ACCEPTED
                ? 'Oferta zostanie oznaczona jako zaakceptowana przez klienta.'
                : 'Oferta zostanie oznaczona jako odrzucona przez klienta.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              className={
                statusToChange === OfferStatus.ACCEPTED
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {updateStatusMutation.isPending
                ? 'Zmienianie statusu...'
                : statusToChange === OfferStatus.ACCEPTED
                  ? 'Zaakceptuj'
                  : 'Odrzuć'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
