import { memo, useCallback, useMemo } from 'react';

import { ClientCard } from '@/components/clients/client-card';
import { type ClientResponseDto } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';

import { Skeleton } from '@/components/ui/skeleton';

// Hoisted empty arrays to prevent re-renders from new reference creation
const EMPTY_CLIENT_ARRAY: ClientResponseDto[] = [];
const EMPTY_FIELD_DEFINITIONS: ClientFieldDefinition[] = [];
const EMPTY_VISIBLE_COLUMNS: string[] = [];

interface ClientPermissions {
  write: boolean;
  delete: boolean;
}

interface ClientGridProps {
  clients: ClientResponseDto[];
  basePath: string;
  isLoading?: boolean;
  selectedClients?: ClientResponseDto[];
  onSelectionChange?: (clients: ClientResponseDto[]) => void;
  onEditClient?: (client: ClientResponseDto) => void;
  onDeleteClient?: (client: ClientResponseDto) => void;
  onRestoreClient?: (client: ClientResponseDto) => void;
  permissions?: ClientPermissions;
  fieldDefinitions?: ClientFieldDefinition[];
  visibleColumns?: string[];
}

const DEFAULT_PERMISSIONS: ClientPermissions = { write: false, delete: false };

export const ClientGrid = memo(function ClientGrid({
  clients,
  basePath,
  isLoading = false,
  selectedClients = EMPTY_CLIENT_ARRAY,
  onSelectionChange,
  onEditClient,
  onDeleteClient,
  onRestoreClient,
  permissions = DEFAULT_PERMISSIONS,
  fieldDefinitions = EMPTY_FIELD_DEFINITIONS,
  visibleColumns = EMPTY_VISIBLE_COLUMNS,
}: ClientGridProps) {
  // Memoize selectedIds Set to prevent recreation on every render
  const selectedIds = useMemo(() => new Set(selectedClients.map((c) => c.id)), [selectedClients]);

  // Create stable callback map for selection handlers to prevent re-renders
  // Each client ID maps to a stable callback that reads current selection from closure
  const selectionHandlers = useMemo(() => {
    if (!onSelectionChange) return null;
    return new Map<string, (selected: boolean) => void>();
  }, [onSelectionChange]);

  // Get or create a stable selection handler for a specific client
  const getSelectionHandler = useCallback(
    (client: ClientResponseDto): ((selected: boolean) => void) | undefined => {
      if (!selectionHandlers || !onSelectionChange) return undefined;

      let handler = selectionHandlers.get(client.id);
      if (!handler) {
        handler = (selected: boolean) => {
          // Read current selection at call time via functional update pattern
          if (selected) {
            onSelectionChange([...selectedClients, client]);
          } else {
            onSelectionChange(selectedClients.filter((c) => c.id !== client.id));
          }
        };
        selectionHandlers.set(client.id, handler);
      }
      return handler;
    },
    [selectionHandlers, onSelectionChange, selectedClients]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="bg-accent/10 h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <p className="text-muted-foreground text-center">Brak wyników</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          basePath={basePath}
          isSelected={selectedIds.has(client.id)}
          onSelect={getSelectionHandler(client)}
          onEdit={onEditClient ? () => onEditClient(client) : undefined}
          onDelete={onDeleteClient ? () => onDeleteClient(client) : undefined}
          onRestore={onRestoreClient ? () => onRestoreClient(client) : undefined}
          permissions={permissions}
          fieldDefinitions={fieldDefinitions}
          visibleColumns={visibleColumns}
        />
      ))}
    </div>
  );
});
