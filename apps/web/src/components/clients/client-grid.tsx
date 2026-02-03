import { ClientCard } from '@/components/clients/client-card';
import { Skeleton } from '@/components/ui/skeleton';
import { type ClientResponseDto } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';


interface ClientGridProps {
  clients: ClientResponseDto[];
  basePath: string;
  isLoading?: boolean;
  selectedClients?: ClientResponseDto[];
  onSelectionChange?: (clients: ClientResponseDto[]) => void;
  onEditClient?: (client: ClientResponseDto) => void;
  onDeleteClient?: (client: ClientResponseDto) => void;
  onRestoreClient?: (client: ClientResponseDto) => void;
  hasWritePermission?: boolean;
  hasDeletePermission?: boolean;
  fieldDefinitions?: ClientFieldDefinition[];
  visibleColumns?: string[];
}

export function ClientGrid({
  clients,
  basePath,
  isLoading = false,
  selectedClients = [],
  onSelectionChange,
  onEditClient,
  onDeleteClient,
  onRestoreClient,
  hasWritePermission = false,
  hasDeletePermission = false,
  fieldDefinitions = [],
  visibleColumns = [],
}: ClientGridProps) {
  const selectedIds = new Set(selectedClients.map((c) => c.id));

  const handleSelectClient = (client: ClientResponseDto, selected: boolean) => {
    if (!onSelectionChange) return;

    if (selected) {
      onSelectionChange([...selectedClients, client]);
    } else {
      onSelectionChange(selectedClients.filter((c) => c.id !== client.id));
    }
  };

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
          onSelect={
            onSelectionChange ? (selected) => handleSelectClient(client, selected) : undefined
          }
          onEdit={onEditClient ? () => onEditClient(client) : undefined}
          onDelete={onDeleteClient ? () => onDeleteClient(client) : undefined}
          onRestore={onRestoreClient ? () => onRestoreClient(client) : undefined}
          hasWritePermission={hasWritePermission}
          hasDeletePermission={hasDeletePermission}
          fieldDefinitions={fieldDefinitions}
          visibleColumns={visibleColumns}
        />
      ))}
    </div>
  );
}
