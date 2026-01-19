import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '@/contexts/auth-context';
import { UserRole } from '@/types/enums';
import {
  createClientSchema,
  CreateClientFormData,
} from '@/lib/validation/schemas';
import {
  useCreateClient,
  useSetClientCustomFields,
  useFieldDefinitions,
  useCheckDuplicates,
} from '@/lib/hooks/use-clients';
import { CreateClientDto, SetCustomFieldValuesDto } from '@/types/dtos';
import { DuplicateCheckResultDto } from '@/lib/api/endpoints/clients';
import {
  EmploymentTypeLabels,
  VatStatusLabels,
  TaxSchemeLabels,
  ZusStatusLabels,
  AmlGroup,
  CustomFieldType,
} from '@/types/enums';
import { AmlGroupLabels, GTU_CODES, PKD_CODES, PKD_SECTIONS } from '@/lib/constants/polish-labels';
import { ClientFieldDefinition } from '@/types/entities';
import { PageHeader } from '@/components/common/page-header';
import { DuplicateWarningDialog } from '@/components/clients/duplicate-warning-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { GroupedCombobox } from '@/components/ui/grouped-combobox';
import { ArrowLeft, Plus, Loader2, Users } from 'lucide-react';

export default function ClientCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const createClient = useCreateClient();
  const setCustomFields = useSetClientCustomFields();
  const checkDuplicates = useCheckDuplicates();
  const { data: fieldDefinitionsResponse } = useFieldDefinitions();
  const fieldDefinitions = fieldDefinitionsResponse?.data ?? [];
  const activeFieldDefinitions = fieldDefinitions.filter((fd) => fd.isActive);

  // Custom field values state
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Duplicate warning state
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResultDto | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<{ data: CreateClientDto; customFields?: SetCustomFieldValuesDto } | null>(null);

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

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
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
    },
  });

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const createClientAndNavigate = async (data: CreateClientDto, customFields?: SetCustomFieldValuesDto) => {
    const newClient = await createClient.mutateAsync(data);
    if (customFields && Object.keys(customFields.values).length > 0) {
      await setCustomFields.mutateAsync({
        id: newClient.id,
        data: customFields,
      });
    }
    navigate(`${basePath}/list`);
  };

  const handleCreateWithDuplicateCheck = async (data: CreateClientDto, customFields?: SetCustomFieldValuesDto) => {
    // Check for duplicates first
    if (data.nip || data.email) {
      const result = await checkDuplicates.mutateAsync({
        nip: data.nip,
        email: data.email,
      });

      if (result.hasDuplicates) {
        setDuplicateCheckResult(result);
        setPendingCreateData({ data, customFields });
        setDuplicateWarningOpen(true);
        return;
      }
    }

    // No duplicates, proceed with creation
    await createClientAndNavigate(data, customFields);
  };

  const handleProceedWithDuplicate = useCallback(async () => {
    if (!pendingCreateData) return;

    try {
      await createClientAndNavigate(pendingCreateData.data, pendingCreateData.customFields);
      setDuplicateWarningOpen(false);
      setDuplicateCheckResult(null);
      setPendingCreateData(null);
    } catch {
      // Error handled by mutation
    }
  }, [pendingCreateData]);

  const handleCancelDuplicate = useCallback(() => {
    setDuplicateWarningOpen(false);
    setDuplicateCheckResult(null);
    setPendingCreateData(null);
  }, []);

  const handleClientClick = useCallback((clientId: string) => {
    navigate(`${basePath}/${clientId}`);
  }, [navigate, basePath]);

  const handleSubmit = async (data: CreateClientFormData) => {
    // Validate required custom fields before submission
    const missingRequiredFields = activeFieldDefinitions
      .filter((fd) => fd.isRequired && !customFieldValues[fd.id])
      .map((fd) => fd.label);

    if (missingRequiredFields.length > 0) {
      return;
    }

    // Clean up empty strings to undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ])
    );

    // Prepare custom field values
    const customFieldsData: SetCustomFieldValuesDto = {
      values: Object.fromEntries(
        Object.entries(customFieldValues).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ])
      ),
    };

    const hasCustomFieldValues = Object.values(customFieldsData.values).some(v => v !== null);

    await handleCreateWithDuplicateCheck(
      cleanedData as CreateClientDto,
      hasCustomFieldValues ? customFieldsData : undefined
    );
  };

  const renderCustomField = (definition: ClientFieldDefinition) => {
    const value = customFieldValues[definition.id] || '';

    switch (definition.fieldType) {
      case CustomFieldType.TEXT:
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomFieldChange(definition.id, e.target.value)}
            placeholder={definition.label}
          />
        );

      case CustomFieldType.NUMBER:
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(definition.id, e.target.value)}
            placeholder={definition.label}
          />
        );

      case CustomFieldType.DATE:
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(definition.id, e.target.value)}
          />
        );

      case CustomFieldType.BOOLEAN:
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'true'}
              onCheckedChange={(checked) => handleCustomFieldChange(definition.id, String(checked))}
            />
            <span className="text-sm text-muted-foreground">
              {value === 'true' ? 'Tak' : 'Nie'}
            </span>
          </div>
        );

      case CustomFieldType.ENUM:
        return (
          <Select
            value={value}
            onValueChange={(v) => handleCustomFieldChange(definition.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz..." />
            </SelectTrigger>
            <SelectContent>
              {definition.enumValues?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleCustomFieldChange(definition.id, e.target.value)}
            placeholder={definition.label}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
      </div>

      <PageHeader
        title="Nowy klient"
        description="Dodaj nowego klienta do systemu"
        icon={<Users className="h-6 w-6" />}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Dane podstawowe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazwa klienta *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nazwa firmy lub imię i nazwisko"
                            className="text-lg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <FormField
                    control={form.control}
                    name="receiveEmailCopy"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
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
                </CardContent>
              </Card>

              {/* Tax and Employment */}
              <Card>
                <CardHeader>
                  <CardTitle>Podatki i zatrudnienie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Dodatkowe informacje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pkdCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Główny kod PKD</FormLabel>
                        <FormControl>
                          <GroupedCombobox
                            options={PKD_CODES.map((pkd) => ({
                              value: pkd.code,
                              label: pkd.label,
                              group: pkd.section,
                            }))}
                            groups={Object.entries(PKD_SECTIONS).map(([key, label]) => ({
                              key,
                              label,
                            }))}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value || '')}
                            placeholder="Wybierz kod PKD"
                            searchPlaceholder="Szukaj kodu PKD..."
                            emptyText="Nie znaleziono kodu"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gtuCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kod GTU</FormLabel>
                          <FormControl>
                            <Combobox
                              options={GTU_CODES.map((gtu) => ({
                                value: gtu.code,
                                label: gtu.label,
                              }))}
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
                            className="min-h-[100px] resize-y"
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
                            className="min-h-[100px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Custom Fields */}
              {activeFieldDefinitions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pola niestandardowe</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - right column */}
            <div className="space-y-6">
              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle>Daty</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data rozpoczęcia firmy</FormLabel>
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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={createClient.isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Plus className="mr-2 h-4 w-4" />
              Dodaj klienta
            </Button>
          </div>
        </form>
      </Form>

      {duplicateCheckResult && (
        <DuplicateWarningDialog
          open={duplicateWarningOpen}
          onOpenChange={setDuplicateWarningOpen}
          byNip={duplicateCheckResult.byNip}
          byEmail={duplicateCheckResult.byEmail}
          onProceed={handleProceedWithDuplicate}
          onCancel={handleCancelDuplicate}
          onViewClient={handleClientClick}
          isPending={createClient.isPending}
        />
      )}
    </div>
  );
}
