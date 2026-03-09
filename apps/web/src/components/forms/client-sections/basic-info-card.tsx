import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { type FormSectionProps } from './types';

/**
 * Basic Information Card - Name, NIP, Email, Phone, Email Copy Switch
 */
export function BasicInfoCard({ control }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dane podstawowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
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
            control={control}
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
            control={control}
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
            control={control}
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
          control={control}
          name="receiveEmailCopy"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
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
      </CardContent>
    </Card>
  );
}
