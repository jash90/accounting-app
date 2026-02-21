import { useCallback, useEffect } from 'react';

import { useFieldArray, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Send, X } from 'lucide-react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { sendOfferSchema, type SendOfferFormData } from '@/lib/validation/schemas';
import { type OfferResponseDto } from '@/types/dtos';

interface SendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferResponseDto;
  onSubmit: (data: SendOfferFormData) => void;
  isLoading?: boolean;
}

export function SendOfferDialog({
  open,
  onOpenChange,
  offer,
  onSubmit,
  isLoading,
}: SendOfferDialogProps) {
  const getDefaultEmail = () => {
    return offer.recipientSnapshot?.email || offer.lead?.email || '';
  };

  const getDefaultSubject = () => {
    return `Oferta ${offer.offerNumber} - ${offer.title}`;
  };

  const getDefaultBody = () => {
    return `Szanowni Państwo,

W załączeniu przesyłamy ofertę nr ${offer.offerNumber} - ${offer.title}.

Wartość oferty: ${Number(offer.totalGrossAmount).toFixed(2)} PLN brutto
Ważność oferty: do ${new Date(offer.validUntil).toLocaleDateString('pl-PL')}

W razie pytań prosimy o kontakt.

Z poważaniem`;
  };

  const form = useForm<SendOfferFormData>({
    resolver: zodResolver(sendOfferSchema),
    defaultValues: {
      email: getDefaultEmail(),
      subject: getDefaultSubject(),
      body: getDefaultBody(),
      cc: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'cc' as never,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: offer.recipientSnapshot?.email || offer.lead?.email || '',
        subject: `Oferta ${offer.offerNumber} - ${offer.title}`,
        body: `Szanowni Państwo,

W załączeniu przesyłamy ofertę nr ${offer.offerNumber} - ${offer.title}.

Wartość oferty: ${Number(offer.totalGrossAmount).toFixed(2)} PLN brutto
Ważność oferty: do ${new Date(offer.validUntil).toLocaleDateString('pl-PL')}

W razie pytań prosimy o kontakt.

Z poważaniem`,
        cc: [],
      });
    }
  }, [open, offer, form]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        form.reset();
      }
      onOpenChange(newOpen);
    },
    [form, onOpenChange]
  );

  const handleSubmit = (data: SendOfferFormData) => {
    const cleanedData = {
      ...data,
      cc: data.cc?.filter((email) => email && email.trim() !== '') || undefined,
    };
    onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Wyślij ofertę
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Recipient */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Odbiorca</h3>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <FormLabel>Kopia (CC)</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => append('')}
                      className="h-7"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Dodaj CC
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="mb-2 flex gap-2">
                      <FormField
                        control={form.control}
                        name={`cc.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <h3 className="text-foreground text-sm font-semibold">Treść wiadomości</h3>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temat</FormLabel>
                      <FormControl>
                        <Input placeholder="Temat wiadomości" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treść</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Treść wiadomości..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Offer Summary */}
              <div className="rounded-lg bg-slate-50 p-4">
                <h4 className="text-foreground mb-2 text-sm font-semibold">Podsumowanie oferty</h4>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Numer:</span> {offer.offerNumber}
                  </p>
                  <p>
                    <span className="font-medium">Tytuł:</span> {offer.title}
                  </p>
                  <p>
                    <span className="font-medium">Odbiorca:</span> {offer.recipientSnapshot.name}
                  </p>
                  <p>
                    <span className="font-medium">Wartość brutto:</span>{' '}
                    {Number(offer.totalGrossAmount).toFixed(2)} PLN
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Wyślij ofertę
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
