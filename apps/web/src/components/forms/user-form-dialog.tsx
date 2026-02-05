import { useEffect } from 'react';

import { useForm, type Resolver } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanies } from '@/lib/hooks/use-companies';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '@/lib/validation/schemas';
import { UserRole, type UserDto } from '@/types/dtos';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDto;
  onSubmit: (data: CreateUserFormData | UpdateUserFormData) => void;
}

export function UserFormDialog({ open, onOpenChange, user, onSubmit }: UserFormDialogProps) {
  const isEditing = !!user;
  const schema = isEditing ? updateUserSchema : createUserSchema;
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();

  type FormData = CreateUserFormData | UpdateUserFormData;

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: user
      ? { ...user, companyId: user.companyId ?? undefined }
      : {
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: UserRole.EMPLOYEE,
          companyId: '',
          companyName: '',
        },
  });

  const watchedRole = form.watch('role');

  // Reset form when dialog opens or user changes
  useEffect(() => {
    if (open) {
      form.reset(
        user
          ? { ...user, companyId: user.companyId ?? undefined }
          : {
              email: '',
              password: '',
              firstName: '',
              lastName: '',
              role: UserRole.EMPLOYEE,
              companyId: '',
              companyName: '',
            }
      );
    }
  }, [open, user, form]);

  const handleSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj użytkownika' : 'Utwórz użytkownika'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="uzytkownik@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię</FormLabel>
                  <FormControl>
                    <Input placeholder="Jan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwisko</FormLabel>
                  <FormControl>
                    <Input placeholder="Kowalski" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rola</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rolę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
                      <SelectItem value={UserRole.COMPANY_OWNER}>Właściciel firmy</SelectItem>
                      <SelectItem value={UserRole.EMPLOYEE}>Pracownik</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Name field for COMPANY_OWNER (creates company automatically) */}
            {!isEditing && watchedRole === UserRole.COMPANY_OWNER && (
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa firmy</FormLabel>
                    <FormControl>
                      <Input placeholder="Nazwa firmy Sp. z o.o." {...field} />
                    </FormControl>
                    <p className="text-muted-foreground text-sm">
                      Firma zostanie automatycznie utworzona dla tego właściciela.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Company dropdown for EMPLOYEE */}
            {!isEditing && watchedRole === UserRole.EMPLOYEE && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={companiesLoading ? 'Ładowanie firm...' : 'Wybierz firmę'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.length === 0 && !companiesLoading && (
                          <SelectItem value="" disabled>
                            Brak dostępnych firm. Najpierw utwórz firmę.
                          </SelectItem>
                        )}
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
