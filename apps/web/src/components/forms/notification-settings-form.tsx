import { useEffect } from 'react';

import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, BellOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import {
  notificationSettingsSchema,
  type NotificationSettingsFormData,
} from '@/lib/validation/schemas';
import { type NotificationSettingsResponseDto } from '@/types/dtos';

interface NotificationSettingsFormProps {
  settings: NotificationSettingsResponseDto | null | undefined;
  onSubmit: (data: NotificationSettingsFormData) => void;
  isLoading?: boolean;
}

export function NotificationSettingsForm({
  settings,
  onSubmit,
  isLoading,
}: NotificationSettingsFormProps) {
  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema) as Resolver<NotificationSettingsFormData>,
    defaultValues: {
      receiveOnCreate: settings?.receiveOnCreate ?? false,
      receiveOnUpdate: settings?.receiveOnUpdate ?? false,
      receiveOnDelete: settings?.receiveOnDelete ?? false,
    },
  });

  // Destructure reset for stable reference in useEffect deps
  const { reset } = form;

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      reset({
        receiveOnCreate: settings.receiveOnCreate,
        receiveOnUpdate: settings.receiveOnUpdate,
        receiveOnDelete: settings.receiveOnDelete,
      });
    }
  }, [settings, reset]);

  const handleSubmit = (data: NotificationSettingsFormData) => {
    onSubmit(data);
  };

  const hasAnyNotification =
    form.watch('receiveOnCreate') || form.watch('receiveOnUpdate') || form.watch('receiveOnDelete');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {hasAnyNotification ? (
            <Bell className="text-apptax-blue h-5 w-5" />
          ) : (
            <BellOff className="text-muted-foreground h-5 w-5" />
          )}
          <CardTitle>Ustawienia powiadomień</CardTitle>
        </div>
        <CardDescription>
          Skonfiguruj, kiedy chcesz otrzymywać powiadomienia email o zmianach w klientach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="receiveOnCreate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Nowy klient</FormLabel>
                    <FormDescription>
                      Otrzymuj powiadomienie, gdy zostanie dodany nowy klient
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiveOnUpdate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Edycja klienta</FormLabel>
                    <FormDescription>
                      Otrzymuj powiadomienie, gdy dane klienta zostaną zmienione
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiveOnDelete"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Usunięcie klienta</FormLabel>
                    <FormDescription>
                      Otrzymuj powiadomienie, gdy klient zostanie usunięty
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isDirty}
                className="bg-apptax-blue hover:bg-apptax-blue/90"
              >
                Zapisz ustawienia
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
