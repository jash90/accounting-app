import { memo, useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Building2,
  Edit,
  Eye,
  History,
  Mail,
  MoreHorizontal,
  Phone,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { IconBadgeList } from '@/components/clients/icon-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { type ClientResponseDto } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';
import {
  CustomFieldType,
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatus,
  VatStatusLabels,
} from '@/types/enums';

// Hoisted empty arrays to prevent re-renders from new reference creation
const EMPTY_FIELD_DEFINITIONS: ClientFieldDefinition[] = [];
const EMPTY_VISIBLE_COLUMNS: string[] = [];

interface ClientPermissions {
  write: boolean;
  delete: boolean;
}

interface ClientCardProps {
  client: ClientResponseDto;
  basePath: string;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  permissions?: ClientPermissions;
  fieldDefinitions?: ClientFieldDefinition[];
  visibleColumns?: string[];
}

const DEFAULT_PERMISSIONS: ClientPermissions = { write: false, delete: false };

export const ClientCard = memo(function ClientCard({
  client,
  basePath,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onRestore,
  permissions = DEFAULT_PERMISSIONS,
  fieldDefinitions = EMPTY_FIELD_DEFINITIONS,
  visibleColumns = EMPTY_VISIBLE_COLUMNS,
}: ClientCardProps) {
  const navigate = useNavigate();

  // Filter custom fields that are visible - memoized to prevent recalculation
  const visibleCustomFields = useMemo(
    () => fieldDefinitions.filter((field) => visibleColumns.includes(`customField_${field.id}`)),
    [fieldDefinitions, visibleColumns]
  );

  // Get custom field value by definition id - memoized callback
  const getCustomFieldValue = useCallback(
    (fieldId: string): string | undefined => {
      const cfv = client.customFieldValues?.find((v) => v.fieldDefinitionId === fieldId);
      return cfv?.value;
    },
    [client.customFieldValues]
  );

  // Format custom field value based on type - memoized callback
  const formatCustomFieldValue = useCallback(
    (field: ClientFieldDefinition): string => {
      const value = getCustomFieldValue(field.id);
      if (!value) return '-';

      switch (field.fieldType) {
        case CustomFieldType.BOOLEAN:
          return value === 'true' ? 'Tak' : 'Nie';
        case CustomFieldType.DATE:
          try {
            return format(new Date(value), 'dd.MM.yyyy', { locale: pl });
          } catch {
            return value;
          }
        default:
          return value;
      }
    },
    [getCustomFieldValue]
  );

  const icons =
    client.iconAssignments
      ?.map((assignment) => assignment.icon)
      .filter((icon): icon is NonNullable<typeof icon> => icon !== undefined && icon !== null) ||
    [];

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking on checkbox or dropdown
      if (
        (e.target as HTMLElement).closest('[data-checkbox]') ||
        (e.target as HTMLElement).closest('[data-dropdown]')
      ) {
        return;
      }
      navigate(`${basePath}/${client.id}`);
    },
    [navigate, basePath, client.id]
  );

  return (
    <Card
      className={cn(
        'group hover:shadow-md border-border cursor-pointer transition-all',
        'hover:border-accent',
        isSelected && 'ring-primary border-primary ring-2'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header row with icons, checkbox and status */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {onSelect && (
              <div
                data-checkbox
                role="presentation"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  aria-label="Zaznacz klienta"
                />
              </div>
            )}
            {icons.length > 0 && <IconBadgeList icons={icons} size="sm" maxVisible={3} />}
          </div>
          <div className="flex items-center gap-2">
            <div data-dropdown>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Otwórz menu akcji"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`${basePath}/${client.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Szczegóły
                  </DropdownMenuItem>

                  {permissions.write && client.isActive && onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edytuj
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => navigate(`${basePath}/${client.id}#changelog`)}>
                    <History className="mr-2 h-4 w-4" />
                    Historia zmian
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {permissions.delete && client.isActive && onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń
                    </DropdownMenuItem>
                  )}

                  {permissions.write && !client.isActive && onRestore && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore();
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Przywróć
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Client name with status */}
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-foreground line-clamp-1 min-w-0 flex-1 text-lg font-semibold">
            {client.name}
          </h3>
          {client.isActive ? (
            <Badge className="shrink-0 bg-green-100 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
              Aktywny
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-xs">
              Nieaktywny
            </Badge>
          )}
        </div>

        {/* NIP */}
        {client.nip && (
          <div className="text-foreground/70 mb-2 flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="font-mono">{client.nip}</span>
          </div>
        )}

        {/* Badges row */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {client.employmentType && (
            <Badge variant="secondary" className="text-xs">
              {EmploymentTypeLabels[client.employmentType]}
            </Badge>
          )}
          {client.vatStatus && (
            <Badge
              variant={client.vatStatus === VatStatus.NO ? 'outline' : 'default'}
              className="text-xs"
            >
              {VatStatusLabels[client.vatStatus]}
            </Badge>
          )}
          {client.taxScheme && (
            <Badge variant="secondary" className="text-xs">
              {TaxSchemeLabels[client.taxScheme]}
            </Badge>
          )}
        </div>

        {/* Contact info */}
        <div className="text-foreground/60 space-y-1.5 text-sm">
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        {/* Custom fields */}
        {visibleCustomFields.length > 0 && (
          <div className="border-border mt-3 space-y-1.5 border-t pt-3 text-sm">
            {visibleCustomFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between">
                <span className="text-foreground/60 truncate">{field.label}:</span>
                <span className="text-foreground/80 ml-2 truncate font-medium">
                  {formatCustomFieldValue(field)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
