import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFieldDefinitions,
  useCreateFieldDefinition,
  useUpdateFieldDefinition,
  useDeleteFieldDefinition,
  useClientIcons,
  useCreateClientIcon,
  useUpdateClientIcon,
  useDeleteClientIcon,
  useNotificationSettings,
  useCreateNotificationSettings,
  useUpdateNotificationSettings,
} from '@/lib/hooks/use-clients';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Settings,
  Tags,
  Image,
} from 'lucide-react';
import { FieldDefinitionFormDialog } from '@/components/forms/field-definition-form-dialog';
import { ClientIconFormDialog } from '@/components/forms/client-icon-form-dialog';
import { NotificationSettingsForm } from '@/components/forms/notification-settings-form';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  ClientFieldDefinitionResponseDto,
  ClientIconResponseDto,
  CreateClientFieldDefinitionDto,
  UpdateClientFieldDefinitionDto,
  UpdateClientIconDto,
  NotificationSettingsFormData,
} from '@/types/dtos';
import { CustomFieldType } from '@/types/enums';
import {
  CreateClientFieldDefinitionFormData,
  UpdateClientFieldDefinitionFormData,
  CreateClientIconFormData,
  UpdateClientIconFormData,
} from '@/lib/validation/schemas';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: 'Tekst',
  [CustomFieldType.NUMBER]: 'Liczba',
  [CustomFieldType.DATE]: 'Data',
  [CustomFieldType.BOOLEAN]: 'Tak/Nie',
  [CustomFieldType.ENUM]: 'Lista wyboru',
};

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

  const [createFieldOpen, setCreateFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<ClientFieldDefinitionResponseDto | null>(null);
  const [deletingField, setDeletingField] = useState<ClientFieldDefinitionResponseDto | null>(null);

  // Icons
  const { data: iconsResponse, isPending: loadingIcons } = useClientIcons();
  const icons = iconsResponse?.data ?? [];
  const createIcon = useCreateClientIcon();
  const updateIcon = useUpdateClientIcon();
  const deleteIcon = useDeleteClientIcon();

  const [createIconOpen, setCreateIconOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<ClientIconResponseDto | null>(null);
  const [deletingIcon, setDeletingIcon] = useState<ClientIconResponseDto | null>(null);

  // Notification Settings
  const { data: notificationSettings, isPending: loadingNotifications } = useNotificationSettings();
  const createNotificationSettings = useCreateNotificationSettings();
  const updateNotificationSettings = useUpdateNotificationSettings();

  const handleFieldSubmit = (data: CreateClientFieldDefinitionFormData | UpdateClientFieldDefinitionFormData) => {
    if (editingField) {
      updateFieldDefinition.mutate(
        {
          id: editingField.id,
          data: data as UpdateClientFieldDefinitionDto,
        },
        {
          onSuccess: () => setEditingField(null),
        }
      );
    } else {
      createFieldDefinition.mutate(data as CreateClientFieldDefinitionDto, {
        onSuccess: () => setCreateFieldOpen(false),
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
          onSuccess: () => setEditingIcon(null),
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
            autoAssignCondition: formData.autoAssignCondition,
          },
          file: formData.file,
        },
        {
          onSuccess: () => setCreateIconOpen(false),
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

      {/* Field Definitions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Pola niestandardowe
              </CardTitle>
              <CardDescription>
                Definiuj dodatkowe pola dla kart klientów
              </CardDescription>
            </div>
            <Button onClick={() => setCreateFieldOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj pole
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFields ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : fieldDefinitions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
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
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {field.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {FIELD_TYPE_LABELS[field.fieldType]}
                      </Badge>
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
                          onClick={() => setEditingField(field)}
                          aria-label={`Edytuj pole ${field.label}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingField(field)}
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

      {/* Icons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Ikony klientów
              </CardTitle>
              <CardDescription>
                Zarządzaj ikonami, które można przypisać do klientów
              </CardDescription>
            </div>
            <Button onClick={() => setCreateIconOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj ikonę
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingIcons ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : icons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak zdefiniowanych ikon
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {icons.map((icon) => (
                <div
                  key={icon.id}
                  className="border rounded-lg p-4 flex flex-col items-center gap-2 relative group"
                  style={{
                    borderColor: icon.color || '#e5e7eb',
                  }}
                >
                  {icon.filePath && (
                    <img
                      src={icon.filePath}
                      alt={icon.name}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-sm font-medium text-center">
                    {icon.name}
                  </span>
                  {!icon.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Nieaktywna
                    </Badge>
                  )}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditingIcon(icon)}
                      aria-label={`Edytuj ikonę ${icon.name}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeletingIcon(icon)}
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

      {/* Notification Settings */}
      {loadingNotifications ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <NotificationSettingsForm
          settings={notificationSettings}
          onSubmit={handleNotificationSubmit}
          isLoading={
            createNotificationSettings.isPending ||
            updateNotificationSettings.isPending
          }
        />
      )}

      {/* Field Definition Dialogs */}
      <FieldDefinitionFormDialog
        open={createFieldOpen}
        onOpenChange={setCreateFieldOpen}
        onSubmit={handleFieldSubmit}
      />

      {editingField && (
        <FieldDefinitionFormDialog
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          fieldDefinition={editingField}
          onSubmit={handleFieldSubmit}
        />
      )}

      {deletingField && (
        <ConfirmDialog
          open={!!deletingField}
          onOpenChange={(open) => !open && setDeletingField(null)}
          title="Usuń pole"
          description={`Czy na pewno chcesz usunąć pole "${deletingField.label}"?`}
          variant="destructive"
          onConfirm={() => {
            deleteFieldDefinition.mutate(deletingField.id, {
              onSuccess: () => {
                setDeletingField(null);
              },
            });
          }}
          isLoading={deleteFieldDefinition.isPending}
        />
      )}

      {/* Icon Dialogs */}
      <ClientIconFormDialog
        open={createIconOpen}
        onOpenChange={setCreateIconOpen}
        onSubmit={handleIconSubmit}
      />

      {editingIcon && (
        <ClientIconFormDialog
          open={!!editingIcon}
          onOpenChange={(open) => !open && setEditingIcon(null)}
          icon={editingIcon}
          onSubmit={handleIconSubmit}
        />
      )}

      {deletingIcon && (
        <ConfirmDialog
          open={!!deletingIcon}
          onOpenChange={(open) => !open && setDeletingIcon(null)}
          title="Usuń ikonę"
          description={`Czy na pewno chcesz usunąć ikonę "${deletingIcon.name}"?`}
          variant="destructive"
          onConfirm={() => {
            deleteIcon.mutate(deletingIcon.id, {
              onSuccess: () => {
                setDeletingIcon(null);
              },
            });
          }}
          isLoading={deleteIcon.isPending}
        />
      )}
    </div>
  );
}
