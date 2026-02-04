import { memo, useCallback, useMemo } from 'react';

import { ClientCard } from '@/components/clients/client-card';
import { Skeleton } from '@/components/ui/skeleton';
import { type ClientResponseDto } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';


// Hoisted empty arrays to prevent re-renders from new reference creation
const EMPTY_CLIENT_ARRAY: ClientResponseDto[] = [];
const EMPTY_FIELD_DEFINITIONS: ClientFieldDefinition[] = [];
const EMPTY_VISIBLE_COLUMNS: string[] = [];

// Hoisted style constant for contentVisibility optimization
const CARD_STYLE = {
  contentVisibility: 'auto',
  containIntrinsicSize: '0 200px',
} as const;

// Pre-allocated skeleton count to avoid array recreation
const SKELETON_COUNT = 8;

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

  // Stable selection handler that uses functional pattern
  // Handler is recreated when onSelectionChange changes, but that's acceptable
  // since parent component should memoize that callback
  const handleSelectionChange = useCallback(
    (client: ClientResponseDto, selected: boolean) => {
      if (!onSelectionChange) return;
      if (selected) {
        onSelectionChange([...selectedClients, client]);
      } else {
        onSelectionChange(selectedClients.filter((c) => c.id !== client.id));
      }
    },
    [onSelectionChange, selectedClients]
  );

  // Stable callback creators using useCallback to avoid recreation per render
  // These return stable functions when the dependencies don't change
  const createSelectHandler = useCallback(
    (client: ClientResponseDto) => (selected: boolean) => handleSelectionChange(client, selected),
    [handleSelectionChange]
  );

  const createEditHandler = useCallback(
    (client: ClientResponseDto) => () => onEditClient?.(client),
    [onEditClient]
  );

  const createDeleteHandler = useCallback(
    (client: ClientResponseDto) => () => onDeleteClient?.(client),
    [onDeleteClient]
  );

  const createRestoreHandler = useCallback(
    (client: ClientResponseDto) => () => onRestoreClient?.(client),
    [onRestoreClient]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
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
        <div key={client.id} style={CARD_STYLE}>
          <ClientCard
            client={client}
            basePath={basePath}
            isSelected={selectedIds.has(client.id)}
            onSelect={onSelectionChange ? createSelectHandler(client) : undefined}
            onEdit={onEditClient ? createEditHandler(client) : undefined}
            onDelete={onDeleteClient ? createDeleteHandler(client) : undefined}
            onRestore={onRestoreClient ? createRestoreHandler(client) : undefined}
            permissions={permissions}
            fieldDefinitions={fieldDefinitions}
            visibleColumns={visibleColumns}
          />
        </div>
      ))}
    </div>
  );
});
