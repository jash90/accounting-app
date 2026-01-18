import { useClientChangelog } from '@/lib/hooks/use-clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Plus, Edit, Trash2 } from 'lucide-react';
import { ChangeAction } from '@/types/enums';
import { ChangeLogResponseDto } from '@/types/dtos';

interface ClientChangelogProps {
  clientId: string;
}

const ACTION_CONFIG: Record<ChangeAction, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' }> = {
  [ChangeAction.CREATE]: {
    label: 'Utworzono',
    icon: <Plus className="h-3 w-3" />,
    variant: 'default',
  },
  [ChangeAction.UPDATE]: {
    label: 'Zaktualizowano',
    icon: <Edit className="h-3 w-3" />,
    variant: 'secondary',
  },
  [ChangeAction.DELETE]: {
    label: 'Usunięto',
    icon: <Trash2 className="h-3 w-3" />,
    variant: 'destructive',
  },
};

function formatFieldName(key: string): string {
  const fieldLabels: Record<string, string> = {
    name: 'Nazwa',
    nip: 'NIP',
    email: 'Email',
    phone: 'Telefon',
    companyStartDate: 'Data rozpoczęcia firmy',
    cooperationStartDate: 'Data rozpoczęcia współpracy',
    suspensionDate: 'Data zawieszenia',
    companySpecificity: 'Specyfika firmy',
    additionalInfo: 'Dodatkowe informacje',
    gtuCode: 'Kod GTU',
    amlGroup: 'Grupa AML',
    employmentType: 'Forma zatrudnienia',
    vatStatus: 'Status VAT',
    taxScheme: 'Forma opodatkowania',
    zusStatus: 'Status ZUS',
    isActive: 'Aktywny',
  };

  return fieldLabels[key] || key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(brak)';
  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
  if (typeof value === 'string') {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('pl-PL');
    }
    return value || '(brak)';
  }
  return String(value);
}

function ChangelogEntry({ entry }: { entry: ChangeLogResponseDto }) {
  const config = ACTION_CONFIG[entry.action];
  const oldValues = entry.oldValues || {};
  const newValues = entry.newValues || {};

  // Get all changed keys
  const changedKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  return (
    <div className="border-l-2 border-apptax-soft-teal pl-4 pb-4 relative">
      <div className="absolute w-3 h-3 bg-apptax-blue rounded-full -left-[7px] top-0" />

      <div className="flex items-center gap-2 mb-2">
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString('pl-PL')}
        </span>
      </div>

      {entry.user && (
        <p className="text-sm text-muted-foreground mb-2">
          przez {entry.user.firstName} {entry.user.lastName}
        </p>
      )}

      {entry.action === ChangeAction.UPDATE && changedKeys.size > 0 && (
        <div className="space-y-1 text-sm">
          {Array.from(changedKeys).map((key) => {
            const oldVal = oldValues[key];
            const newVal = newValues[key];
            if (oldVal === newVal) return null;

            return (
              <div key={key} className="flex items-start gap-2">
                <span className="font-medium text-apptax-navy">
                  {formatFieldName(key)}:
                </span>
                <span className="text-muted-foreground line-through">
                  {formatValue(oldVal)}
                </span>
                <span className="text-apptax-blue">→</span>
                <span className="text-apptax-navy">
                  {formatValue(newVal)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {entry.action === ChangeAction.CREATE && (
        <p className="text-sm text-muted-foreground">
          Klient został utworzony
        </p>
      )}

      {entry.action === ChangeAction.DELETE && (
        <p className="text-sm text-muted-foreground">
          Klient został usunięty (dezaktywowany)
        </p>
      )}
    </div>
  );
}

export function ClientChangelog({ clientId }: ClientChangelogProps) {
  const { data: changelog, isPending, error } = useClientChangelog(clientId);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia zmian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-3 w-3 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia zmian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Nie udało się załadować historii zmian
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia zmian
        </CardTitle>
      </CardHeader>
      <CardContent>
        {changelog && changelog.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {changelog.map((entry) => (
                <ChangelogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak historii zmian dla tego klienta
          </p>
        )}
      </CardContent>
    </Card>
  );
}
