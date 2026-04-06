import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { type ClientFormInstance } from './types';

interface BasicInfoSectionProps {
  form: ClientFormInstance;
}

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  return (
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
                <FormLabel className="text-base">Wyślij email powitalny do klienta</FormLabel>
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
  );
}
