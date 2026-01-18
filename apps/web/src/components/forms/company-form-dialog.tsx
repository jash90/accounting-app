import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createCompanySchema, updateCompanySchema, CreateCompanyFormData, UpdateCompanyFormData } from '@/lib/validation/schemas';
import { CompanyDto } from '@/types/dtos';
import { useAvailableOwners } from '@/lib/hooks/use-users';

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyDto;
  onSubmit: (data: CreateCompanyFormData | UpdateCompanyFormData) => void;
}

export function CompanyFormDialog({ open, onOpenChange, company, onSubmit }: CompanyFormDialogProps) {
  const isEditing = !!company;
  const schema = isEditing ? updateCompanySchema : createCompanySchema;
  const { data: availableOwners, isLoading: ownersLoading } = useAvailableOwners();

  const form = useForm<CreateCompanyFormData | UpdateCompanyFormData>({
    resolver: zodResolver(schema),
    defaultValues: company || {
      name: '',
      ownerId: '',
    },
  });

  const handleSubmit = (data: CreateCompanyFormData | UpdateCompanyFormData) => {
    onSubmit(data);
    form.reset();
  };

  const hasAvailableOwners = availableOwners && availableOwners.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj firmę' : 'Utwórz firmę'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy</FormLabel>
                  <FormControl>
                    <Input placeholder="Nazwa firmy Sp. z o.o." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Właściciel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={ownersLoading ? "Ładowanie właścicieli..." : "Wybierz właściciela"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!hasAvailableOwners && !ownersLoading && (
                          <SelectItem value="" disabled>
                            Brak dostępnych właścicieli. Najpierw utwórz użytkownika typu Właściciel firmy.
                          </SelectItem>
                        )}
                        {availableOwners?.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.firstName} {owner.lastName} ({owner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!hasAvailableOwners && !ownersLoading && (
                      <p className="text-sm text-muted-foreground">
                        Najpierw utwórz użytkownika z rolą &quot;Właściciel firmy&quot;, a następnie utwórz dla niego firmę.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Zapisz' : 'Utwórz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

