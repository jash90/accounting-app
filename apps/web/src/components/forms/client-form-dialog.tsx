import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createClientSchema,
  updateClientSchema,
  CreateClientFormData,
  UpdateClientFormData,
} from '@/lib/validation/schemas';
import { ClientResponseDto, SetCustomFieldValuesDto } from '@/types/dtos';
import {
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  AmlGroup,
} from '@/types/enums';
import { Maximize2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { usePkdSearch, usePkdCode } from '@/lib/hooks/use-pkd-search';
import { Combobox } from '@/components/ui/combobox';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFieldDefinitions } from '@/lib/hooks/use-clients';
import { ClientFieldDefinition } from '@/types/entities';
import { CustomFieldRenderer } from '@/components/clients/custom-field-renderer';
import { useModuleCreatePath } from '@/lib/hooks/use-module-base-path';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientResponseDto;
  onSubmit: (data: CreateClientFormData | UpdateClientFormData, customFields?: SetCustomFieldValuesDto) => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: ClientFormDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createPath = useModuleCreatePath('clients');
  const isEditing = !!client;
  const schema = isEditing ? updateClientSchema : createClientSchema;

  const handleMaximize = () => {
    onOpenChange(false);
    navigate(createPath);
  };

  // Fetch field definitions
  const { data: fieldDefinitionsResponse } = useFieldDefinitions();
  const fieldDefinitions = fieldDefinitionsResponse?.data ?? [];
  const activeFieldDefinitions = fieldDefinitions.filter((fd) => fd.isActive);

  // Custom field values state
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Generate default values from client data or empty form
  const getDefaultValues = useCallback(
    (clientData?: ClientResponseDto): CreateClientFormData | UpdateClientFormData => {
      if (clientData) {
        return {
          name: clientData.name,
          nip: clientData.nip || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          companyStartDate: clientData.companyStartDate
            ? new Date(clientData.companyStartDate)
            : undefined,
          cooperationStartDate: clientData.cooperationStartDate
            ? new Date(clientData.cooperationStartDate)
            : undefined,
          suspensionDate: clientData.suspensionDate
            ? new Date(clientData.suspensionDate)
            : undefined,
          companySpecificity: clientData.companySpecificity || '',
          additionalInfo: clientData.additionalInfo || '',
          gtuCode: clientData.gtuCode || '',
          pkdCode: clientData.pkdCode || '',
          amlGroup: clientData.amlGroup || '',
          employmentType: clientData.employmentType,
          vatStatus: clientData.vatStatus,
          taxScheme: clientData.taxScheme,
          zusStatus: clientData.zusStatus,
          receiveEmailCopy: clientData.receiveEmailCopy ?? true,
        };
      }
      return {
        name: '',
        nip: '',
        email: '',
        phone: '',
        companySpecificity: '',
        additionalInfo: '',
        gtuCode: '',
        pkdCode: '',
        amlGroup: '',
        receiveEmailCopy: true,
      };
    },
    []
  );

  const form = useForm<CreateClientFormData | UpdateClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(client),
  });

  // PKD search hook for server-side search
  const {
    options: pkdSearchOptions,
    groups: pkdGroups,
    setSearch: setPkdSearch,
    isLoading: pkdIsLoading,
    isFetching: pkdIsFetching,
  } = usePkdSearch();

  // Get the currently selected PKD code (for editing)
  const currentPkdValue = form.watch('pkdCode');
  const selectedPkdCode = usePkdCode(currentPkdValue);

  // Merge selected PKD code into options if not already present
  const pkdOptions = useMemo(() => {
    if (!selectedPkdCode) return pkdSearchOptions;

    // Check if the selected code is already in search results
    const isInResults = pkdSearchOptions.some(opt => opt.value === selectedPkdCode.code);
    if (isInResults) return pkdSearchOptions;

    // Add selected code at the beginning for visibility
    return [
      {
        value: selectedPkdCode.code,
        label: selectedPkdCode.label,
        group: selectedPkdCode.section,
      },
      ...pkdSearchOptions,
    ];
  }, [pkdSearchOptions, selectedPkdCode]);

  // Memoize GTU_CODES transformation to avoid recreating on every render
  const gtuOptions = useMemo(
    () =>
      GTU_CODES.map((gtu) => ({
        value: gtu.code,
        label: gtu.label,
      })),
    []
  );

  // Helper to compute initial custom field values from client data
  const getInitialCustomFieldValues = useCallback(
    (clientData?: ClientResponseDto): Record<string, string> => {
      if (!clientData?.customFieldValues) return {};
      const values: Record<string, string> = {};
      clientData.customFieldValues.forEach((cfv) => {
        values[cfv.fieldDefinitionId] = cfv.value || '';
      });
      return values;
    },
    []
  );

  // Handle dialog open/close - initialize or reset state based on transition
  // Note: If client prop changes while dialog is open, it will update on next open/close cycle.
  // For immediate updates when client changes, the parent should use key={client?.id} on this component.
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        // Initialize form and custom fields when dialog opens
        form.reset(getDefaultValues(client));
        setCustomFieldValues(getInitialCustomFieldValues(client));
      } else {
        // Reset on close to prevent stale data
        form.reset(getDefaultValues(undefined));
        setCustomFieldValues({});
      }
      onOpenChange(newOpen);
    },
    [client, form, getDefaultValues, getInitialCustomFieldValues, onOpenChange]
  );

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = (data: CreateClientFormData | UpdateClientFormData) => {
    // Validate required custom fields before submission
    const missingRequiredFields = activeFieldDefinitions
      .filter((fd) => fd.isRequired && !customFieldValues[fd.id])
      .map((fd) => fd.label);

    if (missingRequiredFields.length > 0) {
      // Show toast notification for missing required fields
      toast({
        title: 'Brakujące pola wymagane',
        description: `Proszę wypełnić następujące pola: ${missingRequiredFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Clean up empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    );

    // Prepare custom field values - convert empty strings to null
    const customFieldsData: SetCustomFieldValuesDto = {
      values: Object.fromEntries(
        Object.entries(customFieldValues).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ])
      ),
    };

    // Check if any custom fields have values
    const hasCustomFieldValues = Object.values(customFieldsData.values).some(v => v !== null);

    // Note: Form reset is handled by parent closing dialog on success
    // Do NOT reset here - if mutation fails, user loses their data
    onSubmit(
      cleanedData as CreateClientFormData | UpdateClientFormData,
      hasCustomFieldValues ? customFieldsData : undefined
    );
  };

  const renderCustomField = (definition: ClientFieldDefinition) => {
    const value = customFieldValues[definition.id] || '';

    return (
      <CustomFieldRenderer
        definition={definition}
        value={value}
        onChange={(newValue) => handleCustomFieldChange(definition.id, newValue)}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              {isEditing ? 'Edytuj klienta' : 'Dodaj klienta'}
            </DialogTitle>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleMaximize}
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Maksymalizuj
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Dane podstawowe
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nazwa klienta *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nazwa firmy lub imię i nazwisko" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="+48 123 456 789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receiveEmailCopy"
                    render={({ field }) => (
                      <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Wyślij email powitalny do klienta
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Klient otrzyma email z podsumowaniem wprowadzonych danych
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">Daty</h3>

                <div className="grid grid-cols-3 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="companyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="min-h-[40px] flex items-end">Data rozpoczęcia firmy</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cooperationStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data rozpoczęcia współpracy</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="suspensionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data zawieszenia</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tax and Employment */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Podatki i zatrudnienie
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma zatrudnienia</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(EmploymentTypeLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status VAT</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(VatStatusLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxScheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma opodatkowania</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TaxSchemeLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zusStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status ZUS</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ZusStatusLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-apptax-navy">
                  Dodatkowe informacje
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pkdCode"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Główny kod PKD</FormLabel>
                        <FormControl>
                          <GroupedCombobox
                            options={pkdOptions}
                            groups={pkdGroups}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value || '')}
                            placeholder="Wybierz kod PKD"
                            searchPlaceholder="Szukaj kodu PKD..."
                            emptyText="Nie znaleziono kodu"
                            onSearchChange={setPkdSearch}
                            isLoading={pkdIsLoading || pkdIsFetching}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gtuCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kod GTU</FormLabel>
                        <FormControl>
                          <Combobox
                            options={gtuOptions}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value || '')}
                            placeholder="Wybierz kod GTU"
                            searchPlaceholder="Szukaj kodu GTU..."
                            emptyText="Nie znaleziono kodu"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amlGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupa AML</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz grupę ryzyka" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(AmlGroup).map((group) => (
                              <SelectItem key={group} value={group}>
                                {AmlGroupLabels[group]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companySpecificity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specyfika firmy</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Opisz specyfikę działalności..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dodatkowe informacje</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe uwagi..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Custom Fields */}
              {activeFieldDefinitions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-apptax-navy">
                    Pola niestandardowe
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {activeFieldDefinitions
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((definition) => (
                        <div key={definition.id} className="space-y-2">
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {definition.label}
                            {definition.isRequired && ' *'}
                          </label>
                          {renderCustomField(definition)}
                          {definition.isRequired &&
                            !customFieldValues[definition.id] &&
                            form.formState.isSubmitted && (
                              <p className="text-sm font-medium text-destructive">
                                To pole jest wymagane
                              </p>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleOpenChange(false)}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-apptax-blue hover:bg-apptax-blue/90"
                >
                  {isEditing ? 'Zapisz zmiany' : 'Dodaj klienta'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
