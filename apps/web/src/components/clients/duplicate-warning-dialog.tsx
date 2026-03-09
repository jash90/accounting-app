import { AlertTriangle, ExternalLink } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DuplicateClientInfo {
  id: string;
  name: string;
  nip?: string;
  email?: string;
  isActive: boolean;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  byNip: DuplicateClientInfo[];
  byEmail: DuplicateClientInfo[];
  onProceed: () => void;
  onCancel: () => void;
  onViewClient?: (clientId: string) => void;
  isPending?: boolean;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  byNip,
  byEmail,
  onProceed,
  onCancel,
  onViewClient,
  isPending = false,
}: DuplicateWarningDialogProps) {
  const totalDuplicates = byNip.length + byEmail.length;

  if (totalDuplicates === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Wykryto potencjalne duplikaty
          </DialogTitle>
          <DialogDescription>
            Znaleziono klientów z podobnymi danymi. Sprawdź poniższą listę przed kontynuowaniem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {byNip.length > 0 && (
            <Alert>
              <AlertTitle className="text-sm font-medium">
                Klienci z tym samym NIP ({byNip.length})
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2">
                  {byNip.map((client) => (
                    <li key={client.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{client.name}</span>
                        {!client.isActive && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Nieaktywny
                          </Badge>
                        )}
                        <br />
                        <span className="text-muted-foreground text-xs">NIP: {client.nip}</span>
                      </div>
                      {onViewClient && (
                        <Button variant="ghost" size="sm" onClick={() => onViewClient(client.id)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {byEmail.length > 0 && (
            <Alert>
              <AlertTitle className="text-sm font-medium">
                Klienci z tym samym adresem email ({byEmail.length})
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2">
                  {byEmail.map((client) => (
                    <li key={client.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{client.name}</span>
                        {!client.isActive && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Nieaktywny
                          </Badge>
                        )}
                        <br />
                        <span className="text-muted-foreground text-xs">Email: {client.email}</span>
                      </div>
                      {onViewClient && (
                        <Button variant="ghost" size="sm" onClick={() => onViewClient(client.id)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Anuluj i sprawdź
          </Button>
          <Button
            variant="default"
            onClick={onProceed}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? 'Tworzenie...' : 'Kontynuuj mimo to'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
