import { useCallback, useState } from 'react';

import { useForm, type Control, type FieldValues, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Users } from 'lucide-react';

import { DuplicateWarningDialog } from '@/components/clients/duplicate-warning-dialog';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { PageHeader } from '@/components/common/page-header';
import {
  AdditionalInfoCard,
  BasicInfoCard,
  CustomFieldsCard,
  DatesCard,
  TaxEmploymentCard,
} from '@/components/forms/client-sections';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { type DuplicateCheckResultDto } from '@/lib/api/endpoints/clients';
import {
  useCheckDuplicates,
  useCreateClient,
  useFieldDefinitions,
  useSetClientCustomFields,
} from '@/lib/hooks/use-clients';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { createClientSchema, type CreateClientFormData } from '@/lib/validation/schemas';
import { type CreateClientDto, type SetCustomFieldValuesDto } from '@/types/dtos';

/**
 * Error fallback component for ClientCreatePage
 */
function ClientCreateErrorFallback() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <AlertTriangle className="text-destructive h-16 w-16" />
      <h2 className="text-xl font-semibold">Wystąpił błąd</h2>
      <p className="text-muted-foreground max-w-md text-center">
        Nie udało się załadować formularza. Proszę odświeżyć stronę lub spróbować później.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>
        <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
      </div>
    </div>
  );
}

export default function ClientCreatePage() {
  return (
    <ErrorBoundary fallback={<ClientCreateErrorFallback />}>
      <ClientCreateForm />
    </ErrorBoundary>
  );
}

function ClientCreateForm() {
  'use no memo';
  const navigate = useNavigate();
  const basePath = useModuleBasePath('clients');
  const { toast } = useToast();

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
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResultDto | null>(
    null
  );
  const [pendingCreateData, setPendingCreateData] = useState<{
    data: CreateClientDto;
    customFields?: SetCustomFieldValuesDto;
  } | null>(null);

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema) as Resolver<CreateClientFormData>,
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

  const createClientAndNavigate = async (
    data: CreateClientDto,
    customFields?: SetCustomFieldValuesDto
  ) => {
    const newClient = await createClient.mutateAsync(data);
    if (customFields && Object.keys(customFields.values).length > 0) {
      await setCustomFields.mutateAsync({
        id: newClient.id,
        data: customFields,
      });
    }
    navigate(`${basePath}/list`);
  };

  const handleCreateWithDuplicateCheck = async (
    data: CreateClientDto,
    customFields?: SetCustomFieldValuesDto
  ) => {
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

  /**
   * Handles proceeding with client creation despite duplicate warning.
   * React Compiler handles memoization automatically.
   */
  const handleProceedWithDuplicate = async () => {
    if (!pendingCreateData) return;

    try {
      const newClient = await createClient.mutateAsync(pendingCreateData.data);
      if (
        pendingCreateData.customFields &&
        Object.keys(pendingCreateData.customFields.values).length > 0
      ) {
        await setCustomFields.mutateAsync({
          id: newClient.id,
          data: pendingCreateData.customFields,
        });
      }
      navigate(`${basePath}/list`);
      setDuplicateWarningOpen(false);
      setDuplicateCheckResult(null);
      setPendingCreateData(null);
    } catch {
      // Error notification handled by mutation's onError
    }
  };

  /**
   * Cancel duplicate warning dialog and clear pending state.
   * React Compiler handles memoization automatically.
   */
  const handleCancelDuplicate = () => {
    setDuplicateWarningOpen(false);
    setDuplicateCheckResult(null);
    setPendingCreateData(null);
  };

  const handleClientClick = useCallback(
    (clientId: string) => {
      navigate(`${basePath}/${clientId}`);
    },
    [navigate, basePath]
  );

  const handleSubmit = async (data: CreateClientFormData) => {
    // Validate required custom fields before submission
    const missingRequiredFields = activeFieldDefinitions
      .filter((fd) => fd.isRequired && !customFieldValues[fd.id])
      .map((fd) => fd.label);

    if (missingRequiredFields.length > 0) {
      toast({
        title: 'Brakujące wymagane pola',
        description: `Proszę wypełnić: ${missingRequiredFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Clean up empty strings to undefined
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
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

      const hasCustomFieldValues = Object.values(customFieldsData.values).some((v) => v !== null);

      await handleCreateWithDuplicateCheck(
        cleanedData as unknown as CreateClientDto,
        hasCustomFieldValues ? customFieldsData : undefined
      );
    } catch (error) {
      toast({
        title: 'Błąd podczas tworzenia klienta',
        description: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd',
        variant: 'destructive',
      });
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main content - left column */}
            <div className="space-y-6 lg:col-span-2">
              <BasicInfoCard control={form.control as unknown as Control<FieldValues>} />
              <TaxEmploymentCard control={form.control as unknown as Control<FieldValues>} />
              <AdditionalInfoCard control={form.control as unknown as Control<FieldValues>} />
              <CustomFieldsCard
                definitions={activeFieldDefinitions}
                values={customFieldValues}
                isSubmitted={form.formState.isSubmitted}
                onFieldChange={handleCustomFieldChange}
              />
            </div>

            {/* Sidebar - right column */}
            <div className="space-y-6">
              <DatesCard control={form.control as unknown as Control<FieldValues>} />
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
              {createClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
