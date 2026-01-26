import { Edit, History, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientChangelog } from '@/lib/hooks/use-clients';
import { type ChangeLogResponseDto } from '@/types/dtos';
import { ChangeAction } from '@/types/enums';

import { ChangeDetailRow } from './ChangeDetailRow';

interface ClientChangelogProps {
  clientId: string;
}

const ACTION_CONFIG: Record<
  ChangeAction,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' }
> = {
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

function ChangelogEntry({ entry }: { entry: ChangeLogResponseDto }) {
  const config = ACTION_CONFIG[entry.action];
  const oldValues = entry.oldValues || {};
  const newValues = entry.newValues || {};

  // Get all changed keys
  const changedKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  return (
    <div className="border-accent relative border-l-2 pb-4 pl-4">
      <div className="bg-primary absolute top-0 -left-[7px] h-3 w-3 rounded-full" />

      <div className="mb-2 flex items-center gap-2">
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          {config.label}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {new Date(entry.createdAt).toLocaleString('pl-PL')}
        </span>
      </div>

      {entry.user && (
        <p className="text-muted-foreground mb-2 text-sm">
          przez {entry.user.firstName} {entry.user.lastName}
        </p>
      )}

      {entry.action === ChangeAction.UPDATE && changedKeys.size > 0 && (
        <div className="space-y-1 text-sm">
          {Array.from(changedKeys).map((key) => {
            const oldVal = oldValues[key];
            const newVal = newValues[key];
            if (oldVal === newVal) return null;

            return <ChangeDetailRow key={key} fieldKey={key} oldValue={oldVal} newValue={newVal} />;
          })}
        </div>
      )}

      {entry.action === ChangeAction.CREATE && (
        <p className="text-muted-foreground text-sm">Klient został utworzony</p>
      )}

      {entry.action === ChangeAction.DELETE && (
        <p className="text-muted-foreground text-sm">Klient został usunięty (dezaktywowany)</p>
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
                <div className="flex-1 space-y-2">
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
          <p className="text-destructive text-sm">Nie udało się załadować historii zmian</p>
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
          <p className="text-muted-foreground py-8 text-center text-sm">
            Brak historii zmian dla tego klienta
          </p>
        )}
      </CardContent>
    </Card>
  );
}
