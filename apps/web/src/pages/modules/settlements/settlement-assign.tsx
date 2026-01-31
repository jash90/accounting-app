import { useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { ArrowLeft, User, UserPlus, UserX } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployees } from '@/lib/hooks/use-employees';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { useAssignSettlement, useSettlement } from '@/lib/hooks/use-settlements';

import { StatusBadge } from './components/status-badge';

export default function SettlementAssignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('settlements');

  const settlementId = id ?? '';

  // Fetch data
  const { data: settlement, isPending: settlementPending } = useSettlement(settlementId);
  const { data: employeesResponse, isPending: employeesPending } = useEmployees();
  const employees = employeesResponse?.data ?? [];
  const assignSettlement = useAssignSettlement();

  // Initialize selection based on current assignment (derived, not effect)
  const initialUserId = useMemo(() => {
    return settlement?.userId ?? 'unassigned';
  }, [settlement?.userId]);

  // Form state - "unassigned" is a special value for no assignment
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Use initial value if no selection has been made
  const currentSelection = selectedUserId ?? initialUserId;

  const handleSave = () => {
    const userId = currentSelection === 'unassigned' ? null : currentSelection;

    assignSettlement.mutate(
      {
        id: settlementId,
        data: { userId },
      },
      {
        onSuccess: () => {
          navigate(`${basePath}/list`);
        },
      }
    );
  };

  const getEmployeeName = (employee: { firstName?: string; lastName?: string; email: string }) => {
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employee.email;
  };

  // Check if selection has changed from initial state
  const hasChanges = currentSelection !== initialUserId;

  // Handle missing id
  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="text-destructive text-2xl font-semibold">Błąd</h1>
        <p className="text-muted-foreground mt-2">Nie podano identyfikatora rozliczenia</p>
        <Button onClick={() => navigate(`${basePath}/list`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
      </div>
    );
  }

  if (settlementPending || employeesPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
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

  const monthYearLabel = `${settlement.month.toString().padStart(2, '0')}/${settlement.year}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/list`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Przypisz pracownika"
        description={`${settlement.client?.name ?? 'Nieznany klient'} - ${monthYearLabel}`}
        icon={<UserPlus className="h-6 w-6" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Settlement Info Card */}
        <Card className="border-apptax-soft-teal/30">
          <CardHeader>
            <CardTitle className="text-lg">Informacje o rozliczeniu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">Klient</p>
              <p className="text-apptax-navy font-medium">{settlement.client?.name ?? '-'}</p>
              {settlement.client?.nip && (
                <p className="text-muted-foreground text-xs">NIP: {settlement.client.nip}</p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Okres</p>
              <p className="text-apptax-navy font-medium">{monthYearLabel}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Status</p>
              <StatusBadge status={settlement.status} />
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Obecne przypisanie</p>
              {settlement.assignedUser ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <User className="mr-1 h-3 w-3" />
                    {getEmployeeName(settlement.assignedUser)}
                  </Badge>
                </div>
              ) : (
                <Badge variant="outline">Nieprzypisany</Badge>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Liczba faktur</p>
              <p className="text-apptax-navy font-medium">{settlement.invoiceCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Selection Card */}
        <Card className="border-apptax-soft-teal/30">
          <CardHeader>
            <CardTitle className="text-lg">Wybierz pracownika</CardTitle>
            <CardDescription>
              Wskaż pracownika, który będzie odpowiedzialny za to rozliczenie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={currentSelection}
              onValueChange={setSelectedUserId}
              className="space-y-3"
            >
              {/* Unassign Option */}
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="unassigned" id="unassigned" />
                <Label
                  htmlFor="unassigned"
                  className="flex flex-1 cursor-pointer items-center gap-2"
                >
                  <UserX className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground italic">Brak przypisania</span>
                </Label>
              </div>

              {/* Employee Options */}
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={employee.id} id={employee.id} />
                  <Label
                    htmlFor={employee.id}
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <User className="h-4 w-4 text-apptax-navy" />
                    <div className="flex flex-col">
                      <span className="text-apptax-navy font-medium">
                        {getEmployeeName(employee)}
                      </span>
                      {employee.firstName && employee.lastName && (
                        <span className="text-muted-foreground text-xs">{employee.email}</span>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {employees.length === 0 && (
              <div className="py-8 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mt-2">Brak dostępnych pracowników</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`${basePath}/list`)}
                className="border-apptax-soft-teal hover:bg-apptax-soft-teal/50"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || assignSettlement.isPending}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                {assignSettlement.isPending ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
