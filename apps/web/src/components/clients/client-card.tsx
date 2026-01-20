import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  History,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientResponseDto } from '@/types/dtos';
import { IconBadgeList } from '@/components/clients/icon-badge';
import {
  EmploymentTypeLabels,
  VatStatus,
  VatStatusLabels,
  TaxSchemeLabels,
  CustomFieldType,
} from '@/types/enums';
import { ClientFieldDefinition } from '@/types/entities';
import { cn } from '@/lib/utils/cn';

interface ClientCardProps {
  client: ClientResponseDto;
  basePath: string;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  hasWritePermission?: boolean;
  hasDeletePermission?: boolean;
  fieldDefinitions?: ClientFieldDefinition[];
  visibleColumns?: string[];
}

export const ClientCard = memo(function ClientCard({
  client,
  basePath,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onRestore,
  hasWritePermission = false,
  hasDeletePermission = false,
  fieldDefinitions = [],
  visibleColumns = [],
}: ClientCardProps) {
  const navigate = useNavigate();

  // Filter custom fields that are visible - memoized to prevent recalculation
  const visibleCustomFields = useMemo(
    () => fieldDefinitions.filter((field) => visibleColumns.includes(`customField_${field.id}`)),
    [fieldDefinitions, visibleColumns],
  );

  // Get custom field value by definition id - memoized callback
  const getCustomFieldValue = useCallback(
    (fieldId: string): string | undefined => {
      const cfv = client.customFieldValues?.find((v) => v.fieldDefinitionId === fieldId);
      return cfv?.value;
    },
    [client.customFieldValues],
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
            return new Date(value).toLocaleDateString('pl-PL');
          } catch {
            return value;
          }
        default:
          return value;
      }
    },
    [getCustomFieldValue],
  );

  const icons = client.iconAssignments
    ?.map((assignment) => assignment.icon)
    .filter((icon): icon is NonNullable<typeof icon> => icon !== undefined && icon !== null) || [];

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
        'group cursor-pointer transition-all hover:shadow-apptax-md border-apptax-soft-teal/30',
        'hover:border-apptax-teal/50',
        isSelected && 'ring-2 ring-apptax-blue border-apptax-blue'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header row with icons, checkbox and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {onSelect && (
              <div
                data-checkbox
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  aria-label="Zaznacz klienta"
                />
              </div>
            )}
            {icons.length > 0 && (
              <IconBadgeList icons={icons} size="sm" maxVisible={3} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <div data-dropdown>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

                  {hasWritePermission && client.isActive && onEdit && (
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

                  <DropdownMenuItem
                    onClick={() => navigate(`${basePath}/${client.id}#changelog`)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Historia zmian
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {hasDeletePermission && client.isActive && onDelete && (
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

                  {hasWritePermission && !client.isActive && onRestore && (
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
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-apptax-navy text-lg line-clamp-1 flex-1 min-w-0">
            {client.name}
          </h3>
          {client.isActive ? (
            <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
              Aktywny
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs shrink-0">
              Nieaktywny
            </Badge>
          )}
        </div>

        {/* NIP */}
        {client.nip && (
          <div className="flex items-center gap-2 text-sm text-apptax-navy/70 mb-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="font-mono">{client.nip}</span>
          </div>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
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
        <div className="space-y-1.5 text-sm text-apptax-navy/60">
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
          <div className="mt-3 pt-3 border-t border-apptax-soft-teal/30 space-y-1.5 text-sm">
            {visibleCustomFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between">
                <span className="text-apptax-navy/60 truncate">{field.label}:</span>
                <span className="text-apptax-navy/80 font-medium truncate ml-2">
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
