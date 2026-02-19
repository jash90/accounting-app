import { memo, useEffect, useReducer, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Edit, Image, Plus, Settings, Tags, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { ClientIconFormDialog } from '@/components/forms/client-icon-form-dialog';
import { FieldDefinitionFormDialog } from '@/components/forms/field-definition-form-dialog';
import { NotificationSettingsForm } from '@/components/forms/notification-settings-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthContext } from '@/contexts/auth-context';
import {
  useClientIcons,
  useCreateClientIcon,
  useCreateFieldDefinition,
  useCreateNotificationSettings,
  useDeleteClientIcon,
  useDeleteFieldDefinition,
  useFieldDefinitions,
  useNotificationSettings,
  useUpdateClientIcon,
  useUpdateFieldDefinition,
  useUpdateNotificationSettings,
} from '@/lib/hooks/use-clients';
import {
  type CreateClientFieldDefinitionFormData,
  type CreateClientIconFormData,
  type NotificationSettingsFormData,
  type UpdateClientFieldDefinitionFormData,
  type UpdateClientIconFormData,
} from '@/lib/validation/schemas';
import {
  type ClientFieldDefinitionResponseDto,
  type ClientIconResponseDto,
  type CreateClientFieldDefinitionDto,
  type UpdateClientFieldDefinitionDto,
  type UpdateClientIconDto,
} from '@/types/dtos';
import { CustomFieldType, UserRole } from '@/types/enums';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};

// -- Reducer for settings dialog states --
interface SettingsDialogState {
  createFieldOpen: boolean;
  editingField: ClientFieldDefinitionResponseDto | null;
  deletingField: ClientFieldDefinitionResponseDto | null;
  createIconOpen: boolean;
  editingIcon: ClientIconResponseDto | null;
  deletingIcon: ClientIconResponseDto | null;
}

type SettingsDialogAction =
  | { type: 'OPEN_CREATE_FIELD' }
  | { type: 'CLOSE_CREATE_FIELD' }
  | { type: 'SET_EDITING_FIELD'; payload: ClientFieldDefinitionResponseDto | null }
  | { type: 'SET_DELETING_FIELD'; payload: ClientFieldDefinitionResponseDto | null }
  | { type: 'OPEN_CREATE_ICON' }
  | { type: 'CLOSE_CREATE_ICON' }
  | { type: 'SET_EDITING_ICON'; payload: ClientIconResponseDto | null }
  | { type: 'SET_DELETING_ICON'; payload: ClientIconResponseDto | null };

const settingsDialogInitialState: SettingsDialogState = {
  createFieldOpen: false,
  editingField: null,
  deletingField: null,
  createIconOpen: false,
  editingIcon: null,
  deletingIcon: null,
};

function settingsDialogReducer(
  state: SettingsDialogState,
  action: SettingsDialogAction
): SettingsDialogState {
  switch (action.type) {
    case 'OPEN_CREATE_FIELD':
      return { ...state, createFieldOpen: true };
    case 'CLOSE_CREATE_FIELD':
      return { ...state, createFieldOpen: false };
    case 'SET_EDITING_FIELD':
      return { ...state, editingField: action.payload };
    case 'SET_DELETING_FIELD':
      return { ...state, deletingField: action.payload };
    case 'OPEN_CREATE_ICON':
      return { ...state, createIconOpen: true };
    case 'CLOSE_CREATE_ICON':
      return { ...state, createIconOpen: false };
    case 'SET_EDITING_ICON':
      return { ...state, editingIcon: action.payload };
    case 'SET_DELETING_ICON':
      return { ...state, deletingIcon: action.payload };
  }
}

/**
 * Icon image component with error handling via state
 * Hides the image if it fails to load instead of showing a broken image
 * Uses ref + useEffect to attach error handler and avoid lint warnings
 */
const IconImage = memo(function IconImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleError = () => setHasError(true);
    img.addEventListener('error', handleError);

    return () => img.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return null;
  }

  return <img ref={imgRef} src={src} alt={alt} className="h-12 w-12 object-contain" />;
});

// -- Field Definitions Card sub-component --
interface FieldDefinitionsCardProps {
  fieldDefinitions: ClientFieldDefinitionResponseDto[];
  isLoading: boolean;
  onCreateClick: () => void;
  onEditClick: (field: ClientFieldDefinitionResponseDto) => void;
  onDeleteClick: (field: ClientFieldDefinitionResponseDto) => void;
}

function FieldDefinitionsCard({
  fieldDefinitions,
  isLoading,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: FieldDefinitionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Pola niestandardowe
            </CardTitle>
            <CardDescription>Definiuj dodatkowe pola dla kart klientów</CardDescription>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pole
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : fieldDefinitions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            Brak zdefiniowanych pól niestandardowych
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etykieta</TableHead>
                <TableHead>Nazwa systemowa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Wymagane</TableHead>
                <TableHead>Kolejność</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldDefinitions.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {field.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{FIELD_TYPE_LABELS[field.fieldType]}</Badge>
                  </TableCell>
                  <TableCell>
                    {field.isRequired ? (
                      <Badge variant="default">Tak</Badge>
                    ) : (
                      <Badge variant="outline">Nie</Badge>
                    )}
                  </TableCell>
                  <TableCell>{field.displayOrder}</TableCell>
                  <TableCell>
                    {field.isActive ? (
                      <Badge variant="default">Aktywne</Badge>
                    ) : (
                      <Badge variant="outline">Nieaktywne</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEditClick(field)}
                        aria-label={`Edytuj pole ${field.label}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteClick(field)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Usuń pole ${field.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// -- Icons Card sub-component --
interface IconsCardProps {
  icons: ClientIconResponseDto[];
  isLoading: boolean;
  onCreateClick: () => void;
  onEditClick: (icon: ClientIconResponseDto) => void;
  onDeleteClick: (icon: ClientIconResponseDto) => void;
}

function IconsCard({
  icons,
  isLoading,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: IconsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Ikony klientów
            </CardTitle>
            <CardDescription>Zarządzaj ikonami, które można przypisać do klientów</CardDescription>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj ikonę
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : icons.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Brak zdefiniowanych ikon</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {icons.map((icon) => (
              <div
                key={icon.id}
                className="group relative flex flex-col items-center gap-2 rounded-lg border p-4"
                style={{
                  borderColor: icon.color || '#e5e7eb',
                }}
              >
                {icon.filePath && <IconImage src={icon.filePath} alt={icon.name} />}
                <span className="text-center text-sm font-medium">{icon.name}</span>
                {!icon.isActive && (
                  <Badge variant="outline" className="text-xs">
                    Nieaktywna
                  </Badge>
                )}
                <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onEditClick(icon)}
                    aria-label={`Edytuj ikonę ${icon.name}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-6 w-6"
                    onClick={() => onDeleteClick(icon)}
                    aria-label={`Usuń ikonę ${icon.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientsSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Determine the base path based on user role
  const getBasePath = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/modules/clients';
      case UserRole.COMPANY_OWNER:
        return '/company/modules/clients';
      default:
        return '/modules/clients';
    }
  };

  const basePath = getBasePath();

  // Field Definitions
  const { data: fieldDefinitionsResponse, isPending: loadingFields } = useFieldDefinitions();
  const fieldDefinitions = fieldDefinitionsResponse?.data ?? [];
  const createFieldDefinition = useCreateFieldDefinition();
  const updateFieldDefinition = useUpdateFieldDefinition();
  const deleteFieldDefinition = useDeleteFieldDefinition();

  const [dialogState, dispatchDialog] = useReducer(
    settingsDialogReducer,
    settingsDialogInitialState
  );
  const {
    createFieldOpen,
    editingField,
    deletingField,
    createIconOpen,
    editingIcon,
    deletingIcon,
  } = dialogState;

  // Icons
  const { data: iconsResponse, isPending: loadingIcons } = useClientIcons();
  const icons = iconsResponse?.data ?? [];
  const createIcon = useCreateClientIcon();
  const updateIcon = useUpdateClientIcon();
  const deleteIcon = useDeleteClientIcon();

  // Notification Settings
  const { data: notificationSettings, isPending: loadingNotifications } = useNotificationSettings();
  const createNotificationSettings = useCreateNotificationSettings();
  const updateNotificationSettings = useUpdateNotificationSettings();

  const handleFieldSubmit = (
    data: CreateClientFieldDefinitionFormData | UpdateClientFieldDefinitionFormData
  ) => {
    if (editingField) {
      updateFieldDefinition.mutate(
        {
          id: editingField.id,
          data: data as UpdateClientFieldDefinitionDto,
        },
        {
          onSuccess: () => dispatchDialog({ type: 'SET_EDITING_FIELD', payload: null }),
        }
      );
    } else {
      createFieldDefinition.mutate(data as CreateClientFieldDefinitionDto, {
        onSuccess: () => dispatchDialog({ type: 'CLOSE_CREATE_FIELD' }),
      });
    }
  };

  const handleIconSubmit = (data: CreateClientIconFormData | UpdateClientIconFormData) => {
    if (editingIcon) {
      updateIcon.mutate(
        {
          id: editingIcon.id,
          data: data as UpdateClientIconDto,
        },
        {
          onSuccess: () => dispatchDialog({ type: 'SET_EDITING_ICON', payload: null }),
        }
      );
    } else {
      const formData = data as CreateClientIconFormData;
      createIcon.mutate(
        {
          iconData: {
            name: formData.name,
            color: formData.color,
            iconType: formData.iconType,
            iconValue: formData.iconValue,
            autoAssignCondition: formData.autoAssignCondition ?? undefined,
          },
          file: formData.file,
        },
        {
          onSuccess: () => dispatchDialog({ type: 'CLOSE_CREATE_ICON' }),
        }
      );
    }
  };

  const handleNotificationSubmit = (data: NotificationSettingsFormData) => {
    if (notificationSettings) {
      updateNotificationSettings.mutate(data);
    } else {
      createNotificationSettings.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do modułu
        </Button>
        <PageHeader
          title="Ustawienia modułu Klienci"
          description="Konfiguracja pól niestandardowych, ikon i powiadomień"
          icon={<Settings className="h-6 w-6" />}
        />
      </div>

      <FieldDefinitionsCard
        fieldDefinitions={fieldDefinitions}
        isLoading={loadingFields}
        onCreateClick={() => dispatchDialog({ type: 'OPEN_CREATE_FIELD' })}
        onEditClick={(field) => dispatchDialog({ type: 'SET_EDITING_FIELD', payload: field })}
        onDeleteClick={(field) => dispatchDialog({ type: 'SET_DELETING_FIELD', payload: field })}
      />

      <IconsCard
        icons={icons}
        isLoading={loadingIcons}
        onCreateClick={() => dispatchDialog({ type: 'OPEN_CREATE_ICON' })}
        onEditClick={(icon) => dispatchDialog({ type: 'SET_EDITING_ICON', payload: icon })}
        onDeleteClick={(icon) => dispatchDialog({ type: 'SET_DELETING_ICON', payload: icon })}
      />

      {/* Notification Settings */}
      {loadingNotifications ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <NotificationSettingsForm
          settings={notificationSettings}
          onSubmit={handleNotificationSubmit}
          isLoading={createNotificationSettings.isPending || updateNotificationSettings.isPending}
        />
      )}

      {/* Field Definition Dialogs */}
      <FieldDefinitionFormDialog
        open={createFieldOpen}
        onOpenChange={(open) =>
          dispatchDialog({ type: open ? 'OPEN_CREATE_FIELD' : 'CLOSE_CREATE_FIELD' })
        }
        onSubmit={handleFieldSubmit}
      />

      {editingField && (
        <FieldDefinitionFormDialog
          open={!!editingField}
          onOpenChange={(open) =>
            !open && dispatchDialog({ type: 'SET_EDITING_FIELD', payload: null })
          }
          fieldDefinition={editingField}
          onSubmit={handleFieldSubmit}
        />
      )}

      {deletingField && (
        <ConfirmDialog
          open={!!deletingField}
          onOpenChange={(open) =>
            !open && dispatchDialog({ type: 'SET_DELETING_FIELD', payload: null })
          }
          title="Usuń pole"
          description={`Czy na pewno chcesz usunąć pole "${deletingField.label}"?`}
          variant="destructive"
          onConfirm={() => {
            deleteFieldDefinition.mutate(deletingField.id, {
              onSuccess: () => {
                dispatchDialog({ type: 'SET_DELETING_FIELD', payload: null });
              },
            });
          }}
          isLoading={deleteFieldDefinition.isPending}
        />
      )}

      {/* Icon Dialogs */}
      <ClientIconFormDialog
        open={createIconOpen}
        onOpenChange={(open) =>
          dispatchDialog({ type: open ? 'OPEN_CREATE_ICON' : 'CLOSE_CREATE_ICON' })
        }
        onSubmit={handleIconSubmit}
      />

      {editingIcon && (
        <ClientIconFormDialog
          open={!!editingIcon}
          onOpenChange={(open) =>
            !open && dispatchDialog({ type: 'SET_EDITING_ICON', payload: null })
          }
          icon={editingIcon}
          onSubmit={handleIconSubmit}
        />
      )}

      {deletingIcon && (
        <ConfirmDialog
          open={!!deletingIcon}
          onOpenChange={(open) =>
            !open && dispatchDialog({ type: 'SET_DELETING_ICON', payload: null })
          }
          title="Usuń ikonę"
          description={`Czy na pewno chcesz usunąć ikonę "${deletingIcon.name}"?`}
          variant="destructive"
          onConfirm={() => {
            deleteIcon.mutate(deletingIcon.id, {
              onSuccess: () => {
                dispatchDialog({ type: 'SET_DELETING_ICON', payload: null });
              },
            });
          }}
          isLoading={deleteIcon.isPending}
        />
      )}
    </div>
  );
}
