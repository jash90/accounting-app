import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Calculator,
  Calendar,
  Check,
  Clock,
  CreditCard,
  FileText,
  Trash2,
  User,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/auth-context';
import { useDeleteZusContribution, useMarkZusPaid, useZusContribution } from '@/lib/hooks/use-zus';
import {
  HealthContributionTypeLabels,
  UserRole,
  ZusContributionStatus,
  ZusContributionStatusColors,
  ZusContributionStatusLabels,
  ZusDiscountTypeLabels,
} from '@/types/enums';

const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

function formatDate(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL');
}

function formatAmount(amount?: number | null): string {
  if (amount === undefined || amount === null) return '-';
  return (amount / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}

export default function ZusContributionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const contributionId = id ?? '';
  const { data: contribution, isPending, error } = useZusContribution(contributionId);
  const markPaidMutation = useMarkZusPaid();
  const deleteMutation = useDeleteZusContribution();

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/zus';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/zus';
      default:
        return '/modules/zus';
    }
  };

  const basePath = getBasePath();

  const handleMarkPaid = () => {
    markPaidMutation.mutate(
      {
        id: contributionId,
        dto: {
          paymentDate: new Date(paymentDate),
          paymentReference: paymentReference || undefined,
        },
      },
      {
        onSuccess: () => {
          setMarkPaidOpen(false);
          setPaymentReference('');
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(contributionId, {
      onSuccess: () => {
        navigate(`${basePath}/contributions`);
      },
    });
  };

  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="text-destructive text-2xl font-semibold">Błąd</h1>
        <p className="text-muted-foreground mt-2">Nie podano identyfikatora rozliczenia</p>
        <Button onClick={() => navigate(`${basePath}/contributions`)} className="mt-4">
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

  if (error || !contribution) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/contributions`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Nie znaleziono rozliczenia</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canMarkPaid =
    contribution.status === ZusContributionStatus.CALCULATED ||
    contribution.status === ZusContributionStatus.OVERDUE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/contributions`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do listy
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Calculator className="h-6 w-6" />
              Rozliczenie ZUS - {MONTHS[contribution.periodMonth - 1]} {contribution.periodYear}
            </h1>
            <p className="text-muted-foreground">{contribution.clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canMarkPaid && (
            <Button onClick={() => setMarkPaidOpen(true)}>
              <Check className="mr-2 h-4 w-4" />
              Oznacz jako opłacone
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informacje podstawowe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <InfoItem label="Klient" value={contribution.clientName} />
                <InfoItem
                  label="Okres"
                  value={`${MONTHS[contribution.periodMonth - 1]} ${contribution.periodYear}`}
                />
                <InfoItem
                  label="Status"
                  value={
                    <Badge className={ZusContributionStatusColors[contribution.status]}>
                      {ZusContributionStatusLabels[contribution.status]}
                    </Badge>
                  }
                />
                <InfoItem
                  label="Typ ulgi"
                  value={
                    <Badge variant="secondary">
                      {ZusDiscountTypeLabels[contribution.discountType]}
                    </Badge>
                  }
                />
                <InfoItem
                  label="Typ składki zdrowotnej"
                  value={
                    <Badge variant="outline">
                      {HealthContributionTypeLabels[contribution.healthContributionType]}
                    </Badge>
                  }
                />
                <InfoItem
                  label="Podstawa wymiaru"
                  value={`${formatAmount(contribution.socialBasis)} PLN`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contribution Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Podział składek
              </CardTitle>
              <CardDescription>Szczegółowy podział składek ZUS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Emerytalna</p>
                    <p className="text-xl font-bold">
                      {formatAmount(contribution.retirementAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">19.52%</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Rentowa</p>
                    <p className="text-xl font-bold">
                      {formatAmount(contribution.disabilityAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">8%</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Chorobowa</p>
                    <p className="text-xl font-bold">
                      {formatAmount(contribution.sicknessAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">2.45%</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Wypadkowa</p>
                    <p className="text-xl font-bold">
                      {formatAmount(contribution.accidentAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">1.67%</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Fundusz Pracy</p>
                    <p className="text-xl font-bold">
                      {formatAmount(contribution.laborFundAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">2.45%</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-primary/5">
                    <p className="text-muted-foreground text-sm">Zdrowotna</p>
                    <p className="text-xl font-bold text-primary">
                      {formatAmount(contribution.healthAmount)} PLN
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {HealthContributionTypeLabels[contribution.healthContributionType]}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Suma składek</p>
                      <p className="text-muted-foreground text-sm">Całkowita kwota do zapłaty</p>
                    </div>
                    <p className="text-3xl font-bold">
                      {formatAmount(contribution.totalAmount)} PLN
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {contribution.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notatki
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contribution.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Terminy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem
                label="Termin płatności"
                value={
                  <span
                    className={
                      contribution.status === ZusContributionStatus.OVERDUE
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    {formatDate(contribution.dueDate)}
                  </span>
                }
              />
              {contribution.paymentDate && (
                <InfoItem
                  label="Data płatności"
                  value={
                    <span className="text-green-600">{formatDate(contribution.paymentDate)}</span>
                  }
                />
              )}
              {contribution.paymentReference && (
                <InfoItem label="Numer transakcji" value={contribution.paymentReference} />
              )}
              <InfoItem label="Data utworzenia" value={formatDate(contribution.createdAt)} />
              <InfoItem label="Ostatnia aktualizacja" value={formatDate(contribution.updatedAt)} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Szybkie akcje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canMarkPaid && (
                <Button className="w-full" onClick={() => setMarkPaidOpen(true)}>
                  <Check className="mr-2 h-4 w-4" />
                  Oznacz jako opłacone
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`${basePath}/contributions/create`)}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Nowe rozliczenie
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oznacz jako opłacone</DialogTitle>
            <DialogDescription>
              Wprowadź datę płatności i opcjonalnie numer transakcji
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data płatności</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Numer transakcji (opcjonalnie)</Label>
              <Input
                id="paymentReference"
                placeholder="np. ZUS/2025/01/001"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleMarkPaid} disabled={markPaidMutation.isPending}>
              {markPaidMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Usuń rozliczenie"
        description={`Czy na pewno chcesz usunąć rozliczenie za ${MONTHS[contribution.periodMonth - 1]} ${contribution.periodYear}? Ta operacja jest nieodwracalna.`}
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
