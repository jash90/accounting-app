import { useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import {
  Building2,
  Calculator,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteZusContribution,
  useExportZusContributions,
  useMarkZusPaid,
  useZusContributions,
} from '@/lib/hooks/use-zus';
import type { ZusContributionFiltersDto } from '@/types/dtos';
import {
  ZusContributionStatus,
  ZusContributionStatusColors,
  ZusContributionStatusLabels,
  ZusDiscountTypeLabels,
} from '@/types/enums';

const MONTHS = [
  { value: '1', label: 'Styczeń' },
  { value: '2', label: 'Luty' },
  { value: '3', label: 'Marzec' },
  { value: '4', label: 'Kwiecień' },
  { value: '5', label: 'Maj' },
  { value: '6', label: 'Czerwiec' },
  { value: '7', label: 'Lipiec' },
  { value: '8', label: 'Sierpień' },
  { value: '9', label: 'Wrzesień' },
  { value: '10', label: 'Październik' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Grudzień' },
];

export default function ZusContributionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);

  // Build filters from URL params
  const filters: ZusContributionFiltersDto = {
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as ZusContributionStatus) || undefined,
    contributionType: (searchParams.get('type') as 'OWNER' | 'EMPLOYEE') || undefined,
    periodMonth: searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined,
    periodYear: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: 20,
  };

  const { data, isLoading } = useZusContributions(filters);
  const deleteMutation = useDeleteZusContribution();
  const markPaidMutation = useMarkZusPaid();
  const exportMutation = useExportZusContributions();

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page on filter change
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleMarkPaid = async () => {
    if (markPaidId) {
      await markPaidMutation.mutateAsync({
        id: markPaidId,
        dto: { paidDate: new Date().toISOString() },
      });
      setMarkPaidId(null);
    }
  };

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  // Generate year options (current year and 5 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Rozliczenia ZUS
          </h1>
          <p className="text-muted-foreground">Lista wszystkich rozliczeń składek ZUS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Eksportuj CSV
          </Button>
          <Button asChild>
            <Link to="create">
              <Plus className="mr-2 h-4 w-4" />
              Nowe rozliczenie
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              placeholder="Szukaj klienta..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
            />

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(ZusContributionStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.periodMonth?.toString() || 'all'}
              onValueChange={(value) => updateFilter('month', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Miesiąc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie miesiące</SelectItem>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.periodYear?.toString() || 'all'}
              onValueChange={(value) => updateFilter('year', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie lata</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.contributionType || 'all'}
              onValueChange={(value) => updateFilter('type', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Typ rozliczenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="OWNER">Właściciel</SelectItem>
                <SelectItem value="EMPLOYEE">Pracownik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Pracownik</TableHead>
                <TableHead>Okres</TableHead>
                <TableHead>Typ ulgi</TableHead>
                <TableHead>Składki społeczne</TableHead>
                <TableHead>Składka zdrowotna</TableHead>
                <TableHead>Razem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(11)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell>
                      <Link to={contribution.id} className="font-medium hover:underline">
                        {contribution.client?.name ?? 'Nieznany klient'}
                      </Link>
                      {contribution.client?.nip && (
                        <p className="text-sm text-muted-foreground">
                          NIP: {contribution.client.nip}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {contribution.contributionType === 'OWNER' ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Building2 className="h-3 w-3" />
                          Właściciel
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Users className="h-3 w-3" />
                          Pracownik
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {contribution.clientEmployee ? (
                        <span>
                          {contribution.clientEmployee.firstName}{' '}
                          {contribution.clientEmployee.lastName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {MONTHS[contribution.periodMonth - 1]?.label} {contribution.periodYear}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ZusDiscountTypeLabels[contribution.discountType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{contribution.totalSocialAmountPln} PLN</TableCell>
                    <TableCell>{contribution.healthAmountPln} PLN</TableCell>
                    <TableCell className="font-medium">{contribution.totalAmountPln} PLN</TableCell>
                    <TableCell>
                      <Badge className={ZusContributionStatusColors[contribution.status]}>
                        {ZusContributionStatusLabels[contribution.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(contribution.dueDate).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={contribution.id}>
                              <Eye className="mr-2 h-4 w-4" />
                              Szczegóły
                            </Link>
                          </DropdownMenuItem>
                          {contribution.status !== ZusContributionStatus.PAID && (
                            <DropdownMenuItem onClick={() => setMarkPaidId(contribution.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Oznacz jako opłacone
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(contribution.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calculator className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Brak rozliczeń ZUS</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="create">Utwórz pierwsze rozliczenie</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Wyświetlono {data.data.length} z {data.total} rozliczeń
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page === 1}
              onClick={() => updateFilter('page', (data.page - 1).toString())}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page === data.totalPages}
              onClick={() => updateFilter('page', (data.page + 1).toString())}
            >
              Następna
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć rozliczenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Rozliczenie ZUS zostanie trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid Confirmation Dialog */}
      <AlertDialog open={!!markPaidId} onOpenChange={() => setMarkPaidId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oznaczyć jako opłacone?</AlertDialogTitle>
            <AlertDialogDescription>
              Rozliczenie zostanie oznaczone jako opłacone z dzisiejszą datą płatności.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid}>Oznacz jako opłacone</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
