import { ArrowLeft, Code, FileText, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createStatusBadge } from '@/components/common/status-badge';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useKsefInvoice, useGenerateKsefXml, useSubmitKsefInvoice, useDeleteKsefInvoice, useCheckKsefInvoiceStatus } from '@/lib/hooks/use-ksef';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { formatDate } from '@/lib/utils/format-date';
import {
  KsefInvoiceStatus, KsefInvoiceStatusLabels, KsefInvoiceStatusColors,
  KsefInvoiceTypeLabels, KsefInvoiceDirectionLabels,
  type KsefInvoiceType, type KsefInvoiceDirection,
} from '@/types/enums';

const InvoiceStatusBadge = createStatusBadge<KsefInvoiceStatus>({
  colors: KsefInvoiceStatusColors,
  labels: KsefInvoiceStatusLabels,
});

const formatPLN = (amount: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}

export default function KsefInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const basePath = useModuleBasePath('ksef');
  const navigate = useNavigate();
  const { data: invoice, isPending } = useKsefInvoice(id!);
  const generateXml = useGenerateKsefXml();
  const submitInvoice = useSubmitKsefInvoice();
  const deleteInvoice = useDeleteKsefInvoice();
  const checkStatus = useCheckKsefInvoiceStatus();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link to={`${basePath}/invoices`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Powrót do listy
        </Link>
        <Alert variant="destructive">
          <AlertDescription>Nie znaleziono faktury.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isDraft = invoice.status === KsefInvoiceStatus.DRAFT;
  const lineItems = (invoice.lineItems as Array<Record<string, unknown>>) ?? [];

  const handleDelete = () => {
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => navigate(`${basePath}/invoices`),
    });
  };

  return (
    <div className="space-y-6">
      <Link to={`${basePath}/invoices`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Powrót do listy
      </Link>

      <PageHeader
        title={invoice.invoiceNumber}
        description={`${KsefInvoiceTypeLabels[invoice.invoiceType as KsefInvoiceType] ?? invoice.invoiceType} • ${KsefInvoiceDirectionLabels[invoice.direction as KsefInvoiceDirection] ?? invoice.direction}`}
        icon={<FileText className="h-6 w-6" />}
        action={
          isDraft ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => generateXml.mutate(invoice.id)} disabled={generateXml.isPending}>
                {generateXml.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code className="mr-2 h-4 w-4" />}
                Generuj XML
              </Button>
              <Button onClick={() => submitInvoice.mutate(invoice.id)} disabled={submitInvoice.isPending}>
                {submitInvoice.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Wyślij do KSeF
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usuń fakturę</AlertDialogTitle>
                    <AlertDialogDescription>Czy na pewno chcesz usunąć fakturę {invoice.invoiceNumber}?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      {deleteInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : invoice.status === KsefInvoiceStatus.PENDING_SUBMISSION ? (
            <Button variant="outline" onClick={() => checkStatus.mutate(invoice.id)} disabled={checkStatus.isPending}>
              {checkStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sprawdź status
            </Button>
          ) : undefined
        }
      />

      {/* Invoice Data */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Dane faktury</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <DetailRow label="Numer faktury" value={invoice.invoiceNumber} />
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <InvoiceStatusBadge status={invoice.status as KsefInvoiceStatus} />
            </div>
            <DetailRow label="Data wystawienia" value={formatDate(invoice.issueDate)} />
            <DetailRow label="Termin płatności" value={formatDate(invoice.dueDate)} />
            <DetailRow label="Typ faktury" value={KsefInvoiceTypeLabels[invoice.invoiceType as KsefInvoiceType] ?? invoice.invoiceType} />
            <DetailRow label="Kierunek" value={KsefInvoiceDirectionLabels[invoice.direction as KsefInvoiceDirection] ?? invoice.direction} />
            {invoice.ksefNumber && <DetailRow label="Numer KSeF" value={<Badge variant="outline" className="font-mono">{invoice.ksefNumber}</Badge>} />}
            {invoice.ksefReferenceNumber && <DetailRow label="Ref. KSeF" value={<span className="font-mono text-sm">{invoice.ksefReferenceNumber}</span>} />}
          </div>
        </CardContent>
      </Card>

      {/* Seller & Buyer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Sprzedawca</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Nazwa" value={invoice.sellerName} />
            <DetailRow label="NIP" value={invoice.sellerNip} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Nabywca</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Nazwa" value={invoice.buyerName} />
            <DetailRow label="NIP" value={invoice.buyerNip} />
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Pozycje faktury</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Lp.</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead className="text-right">Ilość</TableHead>
                <TableHead className="text-right">Cena netto</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead className="text-right">VAT %</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{String(item.description ?? '')}</TableCell>
                  <TableCell className="text-right">{String(item.quantity ?? '')}</TableCell>
                  <TableCell className="text-right">{formatPLN(Number(item.unitNetPrice ?? 0))}</TableCell>
                  <TableCell className="text-right">{formatPLN(Number(item.netAmount ?? 0))}</TableCell>
                  <TableCell className="text-right">{String(item.vatRate ?? '')}%</TableCell>
                  <TableCell className="text-right">{formatPLN(Number(item.vatAmount ?? 0))}</TableCell>
                  <TableCell className="text-right font-medium">{formatPLN(Number(item.grossAmount ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Podsumowanie</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <div className="space-y-2 text-right">
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Netto:</span>
                <span className="font-medium">{formatPLN(invoice.netAmount)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">VAT:</span>
                <span className="font-medium">{formatPLN(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between gap-8 border-t pt-2">
                <span className="font-semibold">Brutto:</span>
                <span className="text-lg font-bold">{formatPLN(invoice.grossAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {invoice.validationErrors && (invoice.validationErrors as unknown[]).length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="mb-2 font-medium">Błędy walidacji:</p>
            <ul className="list-inside list-disc text-sm">
              {(invoice.validationErrors as Array<Record<string, unknown>>).map((err, i) => (
                <li key={i}>
                  {typeof err.field === 'string' && typeof err.message === 'string'
                    ? <><span className="font-medium">{err.field}:</span> {err.message}</>
                    : JSON.stringify(err)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Timestamps */}
      {(invoice.submittedAt || invoice.acceptedAt || invoice.rejectedAt) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Historia</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {invoice.submittedAt && <DetailRow label="Wysłana" value={formatDate(invoice.submittedAt)} />}
              {invoice.acceptedAt && <DetailRow label="Zaakceptowana" value={formatDate(invoice.acceptedAt)} />}
              {invoice.rejectedAt && <DetailRow label="Odrzucona" value={formatDate(invoice.rejectedAt)} />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
