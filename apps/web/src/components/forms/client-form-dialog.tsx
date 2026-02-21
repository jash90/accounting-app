import { useCallback, useEffect, useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { zodResolver } from '@hookform/resolvers/zod';
import { addMonths } from 'date-fns';
import { AlertCircle, Maximize2 } from 'lucide-react';

import { CustomFieldRenderer } from '@/components/clients/custom-field-renderer';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ReliefType, ReliefTypeDurationMonths } from '@/lib/api/endpoints/relief-periods';
import { AmlGroupLabels, GTU_CODES } from '@/lib/constants/polish-labels';
import { useFieldDefinitions } from '@/lib/hooks/use-clients';
import { useModuleCreatePath } from '@/lib/hooks/use-module-base-path';
import { usePkdCode, usePkdSearch } from '@/lib/hooks/use-pkd-search';
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientFormData,
  type UpdateClientFormData,
} from '@/lib/validation/schemas';
import { type ClientResponseDto, type SetCustomFieldValuesDto } from '@/types/dtos';
import { type ClientFieldDefinition } from '@/types/entities';
import {
  AmlGroup,
  EmploymentTypeLabels,
  TaxSchemeLabels,
  VatStatusLabels,
  ZusStatusLabels,
} from '@/types/enums';

export interface ReliefPeriodFormData {
  reliefType: ReliefType;
  startDate: string;
  endDate?: string;
}

export interface ClientReliefsData {
  ulgaNaStart?: ReliefPeriodFormData;
  malyZus?: ReliefPeriodFormData;
}

// Relief state interface and initial value moved to module level for stable reference
interface ReliefState {
  ulgaNaStartEnabled: boolean;
  ulgaNaStartStartDate: Date | undefined;
  ulgaNaStartEndDate: Date | undefined;
  malyZusEnabled: boolean;
  malyZusStartDate: Date | undefined;
  malyZusEndDate: Date | undefined;
}

const INITIAL_RELIEF_STATE: ReliefState = {
  ulgaNaStartEnabled: false,
  ulgaNaStartStartDate: undefined,
  ulgaNaStartEndDate: undefined,
  malyZusEnabled: false,
  malyZusStartDate: undefined,
  malyZusEndDate: undefined,
};

// Empty array constant to prevent re-renders from default prop recreation
const EMPTY_EXISTING_RELIEFS: { reliefType: ReliefType; startDate: string; endDate: string }[] = [];

// Extracted component for rendering individual custom fields - avoids inline render function
function CustomFieldItem({
  definition,
  value,
  hasError,
  onChange,
}: {
  definition: ClientFieldDefinition;
  value: string;
  hasError: boolean;
  onChange: (fieldId: string, value: string) => void;
}) {
  const handleChange = useCallback(
    (newValue: string) => onChange(definition.id, newValue),
    [definition.id, onChange]
  );

  return (
    <CustomFieldRenderer
      definition={definition}
      value={value}
      onChange={handleChange}
      aria-describedby={hasError ? `custom-field-${definition.id}-error` : undefined}
      aria-invalid={hasError}
    />
  );
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientResponseDto;
  onSubmit: (
    data: CreateClientFormData | UpdateClientFormData,
    customFields?: SetCustomFieldValuesDto,
    reliefs?: ClientReliefsData
  ) => void;
  existingReliefs?: { reliefType: ReliefType; startDate: string; endDate: string }[];
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  existingReliefs = EMPTY_EXISTING_RELIEFS,
}: ClientFormDialogProps) {
  'use no memo';
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

  // Memoize sorted field definitions to avoid re-sorting on every render
  const sortedFieldDefinitions = useMemo(
    () => activeFieldDefinitions.slice().sort((a, b) => a.displayOrder - b.displayOrder),
    [activeFieldDefinitions]
  );

  // Custom field values state
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Relief periods state - consolidated to reduce render cycles
  const [reliefState, setReliefState] = useState<ReliefState>(INITIAL_RELIEF_STATE);

  // Destructure for easier access while maintaining consolidated state
  const {
    ulgaNaStartEnabled,
    ulgaNaStartStartDate,
    ulgaNaStartEndDate,
    malyZusEnabled,
    malyZusStartDate,
    malyZusEndDate,
  } = reliefState;

  // Setter functions that update specific relief state properties
  const setUlgaNaStartEnabled = (enabled: boolean) =>
    setReliefState((prev) => ({ ...prev, ulgaNaStartEnabled: enabled }));
  const setUlgaNaStartStartDate = (date: Date | undefined) =>
    setReliefState((prev) => ({ ...prev, ulgaNaStartStartDate: date }));
  const setUlgaNaStartEndDate = (date: Date | undefined) =>
    setReliefState((prev) => ({ ...prev, ulgaNaStartEndDate: date }));
  const setMalyZusEnabled = (enabled: boolean) =>
    setReliefState((prev) => ({ ...prev, malyZusEnabled: enabled }));
  const setMalyZusStartDate = (date: Date | undefined) =>
    setReliefState((prev) => ({ ...prev, malyZusStartDate: date }));
  const setMalyZusEndDate = (date: Date | undefined) =>
    setReliefState((prev) => ({ ...prev, malyZusEndDate: date }));

  // Initialize relief state from existing reliefs - single state update reduces render cycles
  useEffect(() => {
    if (!open || existingReliefs.length === 0) return;

    const ulgaNaStart = existingReliefs.find((r) => r.reliefType === ReliefType.ULGA_NA_START);
    const malyZus = existingReliefs.find((r) => r.reliefType === ReliefType.MALY_ZUS);

    // Single state update instead of 6 separate updates
    setReliefState({
      ulgaNaStartEnabled: !!ulgaNaStart,
      ulgaNaStartStartDate: ulgaNaStart ? new Date(ulgaNaStart.startDate) : undefined,
      ulgaNaStartEndDate: ulgaNaStart ? new Date(ulgaNaStart.endDate) : undefined,
      malyZusEnabled: !!malyZus,
      malyZusStartDate: malyZus ? new Date(malyZus.startDate) : undefined,
      malyZusEndDate: malyZus ? new Date(malyZus.endDate) : undefined,
    });
  }, [existingReliefs, open]);

  // Auto-calculate end dates when start dates change
  const handleUlgaNaStartStartDateChange = (date: Date | undefined) => {
    setUlgaNaStartStartDate(date);
    if (date) {
      setUlgaNaStartEndDate(addMonths(date, ReliefTypeDurationMonths[ReliefType.ULGA_NA_START]));
    }
  };

  const handleMalyZusStartDateChange = (date: Date | undefined) => {
    setMalyZusStartDate(date);
    if (date) {
      setMalyZusEndDate(addMonths(date, ReliefTypeDurationMonths[ReliefType.MALY_ZUS]));
    }
  };

  // Reset relief state - single update instead of 6 separate updates
  const resetReliefState = useCallback(() => {
    setReliefState(INITIAL_RELIEF_STATE);
  }, []);

  // Compute form values synchronously - avoids useEffect render cycle
  // react-hook-form's `values` prop syncs external values without extra re-renders
  const formValues = useMemo((): CreateClientFormData | UpdateClientFormData => {
    if (client) {
      return {
        name: client.name,
        nip: client.nip || '',
        email: client.email || '',
        phone: client.phone || '',
        companyStartDate: client.companyStartDate ? new Date(client.companyStartDate) : undefined,
        cooperationStartDate: client.cooperationStartDate
          ? new Date(client.cooperationStartDate)
          : undefined,
        companySpecificity: client.companySpecificity || '',
        additionalInfo: client.additionalInfo || '',
        gtuCode: client.gtuCode || '',
        pkdCode: client.pkdCode || '',
        amlGroup: client.amlGroup || '',
        employmentType: client.employmentType,
        vatStatus: client.vatStatus,
        taxScheme: client.taxScheme,
        zusStatus: client.zusStatus,
        receiveEmailCopy: client.receiveEmailCopy ?? true,
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
  }, [client]);

  const form = useForm<CreateClientFormData | UpdateClientFormData>({
    resolver: zodResolver(schema),
    values: formValues, // Syncs values without useEffect - reduces render cycles
    resetOptions: {
      keepDirtyValues: false, // Reset all values when formValues changes
    },
  });

  // Helper function for getting default values (used in handleOpenChange for reset)
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
    const isInResults = pkdSearchOptions.some((opt) => opt.value === selectedPkdCode.code);
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
        // Note: Relief state is initialized via useEffect watching existingReliefs
      } else {
        // Reset on close to prevent stale data
        form.reset(getDefaultValues(undefined));
        setCustomFieldValues({});
        resetReliefState();
      }
      onOpenChange(newOpen);
    },
    [client, form, getDefaultValues, getInitialCustomFieldValues, onOpenChange, resetReliefState]
  );

  /**
   * Handles custom field value changes.
   * Wrapped in useCallback to maintain stable reference for child components,
   * preventing unnecessary re-renders when used in lists of custom fields.
   */
  const handleCustomFieldChange = useCallback((fieldId: string, value: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

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

    // Validate relief period dates
    if (ulgaNaStartEnabled && !ulgaNaStartStartDate) {
      toast({
        title: 'Brakująca data',
        description: 'Data rozpoczęcia ulgi na start jest wymagana',
        variant: 'destructive',
      });
      return;
    }

    if (malyZusEnabled && !malyZusStartDate) {
      toast({
        title: 'Brakująca data',
        description: 'Data rozpoczęcia małego ZUS jest wymagana',
        variant: 'destructive',
      });
      return;
    }

    // Clean up empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
    );

    // Prepare custom field values - convert empty strings to null
    const customFieldsData: SetCustomFieldValuesDto = {
      values: Object.fromEntries(
        Object.entries(customFieldValues).map(([key, value]) => [key, value === '' ? null : value])
      ),
    };

    // Check if any custom fields have values
    const hasCustomFieldValues = Object.values(customFieldsData.values).some((v) => v !== null);

    // Prepare relief periods data
    const reliefsData: ClientReliefsData = {};

    if (ulgaNaStartEnabled && ulgaNaStartStartDate) {
      reliefsData.ulgaNaStart = {
        reliefType: ReliefType.ULGA_NA_START,
        startDate: ulgaNaStartStartDate.toISOString(),
        endDate: ulgaNaStartEndDate?.toISOString(),
      };
    }

    if (malyZusEnabled && malyZusStartDate) {
      reliefsData.malyZus = {
        reliefType: ReliefType.MALY_ZUS,
        startDate: malyZusStartDate.toISOString(),
        endDate: malyZusEndDate?.toISOString(),
      };
    }

    const hasReliefs = Object.keys(reliefsData).length > 0;

    // Note: Form reset is handled by parent closing dialog on success
    // Do NOT reset here - if mutation fails, user loses their data
    onSubmit(
      cleanedData as CreateClientFormData | UpdateClientFormData,
      hasCustomFieldValues ? customFieldsData : undefined,
      hasReliefs ? reliefsData : undefined
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? 'Edytuj klienta' : 'Dodaj klienta'}</DialogTitle>
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Dane podstawowe</h3>

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
                          <Input type="email" placeholder="email@example.com" {...field} />
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
                          <p className="text-muted-foreground text-sm">
                            Klient otrzyma email z podsumowaniem wprowadzonych danych
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Daty</h3>

                <div className="grid grid-cols-2 items-end gap-4">
                  <FormField
                    control={form.control}
                    name="companyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex min-h-[40px] items-end">
                          Data rozpoczęcia firmy
                        </FormLabel>
                        <FormControl>
                          <DatePicker
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : undefined
                            }
                            onChange={(value) => {
                              if (!value) {
                                field.onChange(undefined);
                                return;
                              }
                              const [year, month, day] = value.split('-').map(Number);
                              field.onChange(new Date(year, month - 1, day));
                            }}
                            placeholder="Wybierz datę"
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
                          <DatePicker
                            value={
                              field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : undefined
                            }
                            onChange={(value) => {
                              if (!value) {
                                field.onChange(undefined);
                                return;
                              }
                              const [year, month, day] = value.split('-').map(Number);
                              field.onChange(new Date(year, month - 1, day));
                            }}
                            placeholder="Wybierz datę"
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
                <h3 className="text-foreground text-sm font-semibold">Podatki i zatrudnienie</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma zatrudnienia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(EmploymentTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(VatStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TaxSchemeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ZusStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Relief Periods */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Ulgi i preferencje ZUS</h3>

                {/* Ulga na start */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="ulga-na-start-switch" className="text-sm font-medium">
                        Ulga na start
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Zwolnienie ze składek ZUS na 6 miesięcy
                      </p>
                    </div>
                    <Switch
                      id="ulga-na-start-switch"
                      checked={ulgaNaStartEnabled}
                      onCheckedChange={(checked) => {
                        setUlgaNaStartEnabled(checked);
                        if (!checked) {
                          setUlgaNaStartStartDate(undefined);
                          setUlgaNaStartEndDate(undefined);
                        }
                      }}
                    />
                  </div>

                  {ulgaNaStartEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label htmlFor="ulga-na-start-start-date" className="text-sm font-medium">
                          Data rozpoczęcia *
                        </label>
                        <Input
                          id="ulga-na-start-start-date"
                          type="date"
                          aria-describedby="ulga-na-start-start-date-error"
                          aria-invalid={!ulgaNaStartStartDate}
                          value={
                            ulgaNaStartStartDate
                              ? ulgaNaStartStartDate.toISOString().split('T')[0]
                              : ''
                          }
                          onChange={(e) =>
                            handleUlgaNaStartStartDateChange(
                              e.target.value ? new Date(e.target.value) : undefined
                            )
                          }
                        />
                        {!ulgaNaStartStartDate && form.formState.isSubmitted && (
                          <p
                            id="ulga-na-start-start-date-error"
                            className="text-destructive text-sm font-medium"
                            role="alert"
                          >
                            Data rozpoczęcia jest wymagana
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="ulga-na-start-end-date" className="text-sm font-medium">
                          Data zakończenia
                        </label>
                        <Input
                          id="ulga-na-start-end-date"
                          type="date"
                          aria-describedby="ulga-na-start-end-date-help"
                          value={
                            ulgaNaStartEndDate ? ulgaNaStartEndDate.toISOString().split('T')[0] : ''
                          }
                          onChange={(e) =>
                            setUlgaNaStartEndDate(
                              e.target.value ? new Date(e.target.value) : undefined
                            )
                          }
                        />
                        <p
                          id="ulga-na-start-end-date-help"
                          className="text-muted-foreground text-xs"
                        >
                          Automatycznie obliczone: 6 miesięcy od daty rozpoczęcia
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mały ZUS */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="maly-zus-switch" className="text-sm font-medium">
                        Mały ZUS (Mały ZUS Plus)
                      </label>
                      <p className="text-muted-foreground text-xs">
                        Niższe składki ZUS na 36 miesięcy
                      </p>
                    </div>
                    <Switch
                      id="maly-zus-switch"
                      checked={malyZusEnabled}
                      onCheckedChange={(checked) => {
                        setMalyZusEnabled(checked);
                        if (!checked) {
                          setMalyZusStartDate(undefined);
                          setMalyZusEndDate(undefined);
                        }
                      }}
                    />
                  </div>

                  {malyZusEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label htmlFor="maly-zus-start-date" className="text-sm font-medium">
                          Data rozpoczęcia *
                        </label>
                        <Input
                          id="maly-zus-start-date"
                          type="date"
                          aria-describedby="maly-zus-start-date-error"
                          aria-invalid={!malyZusStartDate}
                          value={
                            malyZusStartDate ? malyZusStartDate.toISOString().split('T')[0] : ''
                          }
                          onChange={(e) =>
                            handleMalyZusStartDateChange(
                              e.target.value ? new Date(e.target.value) : undefined
                            )
                          }
                        />
                        {!malyZusStartDate && form.formState.isSubmitted && (
                          <p
                            id="maly-zus-start-date-error"
                            className="text-destructive text-sm font-medium"
                            role="alert"
                          >
                            Data rozpoczęcia jest wymagana
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="maly-zus-end-date" className="text-sm font-medium">
                          Data zakończenia
                        </label>
                        <Input
                          id="maly-zus-end-date"
                          type="date"
                          aria-describedby="maly-zus-end-date-help"
                          value={malyZusEndDate ? malyZusEndDate.toISOString().split('T')[0] : ''}
                          onChange={(e) =>
                            setMalyZusEndDate(e.target.value ? new Date(e.target.value) : undefined)
                          }
                        />
                        <p id="maly-zus-end-date-help" className="text-muted-foreground text-xs">
                          Automatycznie obliczone: 36 miesięcy od daty rozpoczęcia
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info box about notifications */}
                {(ulgaNaStartEnabled || malyZusEnabled) && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-xs text-blue-700">
                      <p className="font-medium">Powiadomienia o wygaśnięciu</p>
                      <p className="mt-0.5">
                        System wyśle przypomnienia 7 dni i 1 dzień przed datą zakończenia ulgi do
                        wszystkich pracowników i właściciela firmy.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Dodatkowe informacje</h3>

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
                        <Select onValueChange={field.onChange} value={field.value || ''}>
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
              {sortedFieldDefinitions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-foreground text-sm font-semibold">Pola niestandardowe</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {sortedFieldDefinitions.map((definition) => (
                      <div key={definition.id} className="space-y-2">
                        <label
                          htmlFor={`custom-field-${definition.id}`}
                          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {definition.label}
                          {definition.isRequired && ' *'}
                        </label>
                        <CustomFieldItem
                          definition={definition}
                          value={customFieldValues[definition.id] || ''}
                          hasError={
                            definition.isRequired &&
                            !customFieldValues[definition.id] &&
                            form.formState.isSubmitted
                          }
                          onChange={handleCustomFieldChange}
                        />
                        {definition.isRequired &&
                          !customFieldValues[definition.id] &&
                          form.formState.isSubmitted && (
                            <p
                              id={`custom-field-${definition.id}-error`}
                              className="text-destructive text-sm font-medium"
                              role="alert"
                            >
                              To pole jest wymagane
                            </p>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-primary hover:bg-primary/90"
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
