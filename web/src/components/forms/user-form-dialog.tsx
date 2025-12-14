import { useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createUserSchema, updateUserSchema, CreateUserFormData, UpdateUserFormData } from '@/lib/validation/schemas';
import { UserDto, UserRole } from '@/types/dtos';
import { useCompanies } from '@/lib/hooks/use-companies';

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

  const form = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(schema),
    defaultValues: user || {
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
      form.reset(user || {
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: UserRole.EMPLOYEE,
        companyId: '',
        companyName: '',
      });
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
          <DialogTitle>{isEditing ? 'Edit User' : 'Create User'}</DialogTitle>
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
                    <Input type="email" placeholder="user@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
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
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
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
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
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
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.COMPANY_OWNER}>Company Owner</SelectItem>
                      <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
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
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      A company will be created automatically for this owner.
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
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={companiesLoading ? "Loading companies..." : "Select a company"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.length === 0 && !companiesLoading && (
                          <SelectItem value="" disabled>
                            No companies available. Create a company first.
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
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

