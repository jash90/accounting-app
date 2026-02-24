import { useEffect } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCompanyProfile, useUpdateCompanyProfile } from '@/lib/hooks/use-company-profile';

function validateNip(nip: string | undefined): boolean {
  if (!nip) return true;
  const digits = nip.replace(/[-\s]/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  return sum % 11 === parseInt(digits[9], 10);
}

function validateRegon(regon: string | undefined): boolean {
  if (!regon) return true;
  const digits = regon.replace(/[-\s]/g, '');
  if (!/^\d{9}$|^\d{14}$/.test(digits)) return false;
  if (digits.length === 9) {
    const weights = [8, 9, 2, 3, 4, 5, 6, 7];
    const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
    const checksum = sum % 11 === 10 ? 0 : sum % 11;
    return checksum === parseInt(digits[8], 10);
  }
  const weights14 = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
  const sum14 = weights14.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  const checksum14 = sum14 % 11 === 10 ? 0 : sum14 % 11;
  return checksum14 === parseInt(digits[13], 10);
}

const profileSchema = z.object({
  nip: z.string().optional().refine(validateNip, { message: 'Nieprawidłowy NIP' }),
  regon: z.string().optional().refine(validateRegon, { message: 'Nieprawidłowy REGON' }),
  krs: z.string().optional(),
  ownerName: z.string().optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerEmail: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Nieprawidłowy email' }),
  ownerPhone: z.string().optional(),
  street: z.string().optional(),
  buildingNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  defaultEmailSignature: z.string().optional(),
  defaultDocumentFooter: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompanyProfilePage() {
  const { data: profile, isLoading } = useCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nip: '',
      regon: '',
      krs: '',
      ownerName: '',
      ownerFirstName: '',
      ownerLastName: '',
      ownerEmail: '',
      ownerPhone: '',
      street: '',
      buildingNumber: '',
      apartmentNumber: '',
      city: '',
      postalCode: '',
      country: 'Polska',
      phone: '',
      bankAccount: '',
      bankName: '',
      defaultEmailSignature: '',
      defaultDocumentFooter: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        nip: profile.nip ?? '',
        regon: profile.regon ?? '',
        krs: profile.krs ?? '',
        ownerName: profile.ownerName ?? '',
        ownerFirstName: profile.ownerFirstName ?? '',
        ownerLastName: profile.ownerLastName ?? '',
        ownerEmail: profile.ownerEmail ?? '',
        ownerPhone: profile.ownerPhone ?? '',
        street: profile.street ?? '',
        buildingNumber: profile.buildingNumber ?? '',
        apartmentNumber: profile.apartmentNumber ?? '',
        city: profile.city ?? '',
        postalCode: profile.postalCode ?? '',
        country: profile.country ?? 'Polska',
        phone: profile.phone ?? '',
        bankAccount: profile.bankAccount ?? '',
        bankName: profile.bankName ?? '',
        defaultEmailSignature: profile.defaultEmailSignature ?? '',
        defaultDocumentFooter: profile.defaultDocumentFooter ?? '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success('Profil firmy zaktualizowany');
    } catch {
      toast.error('Błąd podczas aktualizacji profilu');
    }
  };

  if (isLoading) return <div className="p-6">Ładowanie...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil firmy</h1>
        <p className="text-muted-foreground">Zarządzaj danymi firmy używanymi w dokumentach</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dane podstawowe</CardTitle>
              <CardDescription>NIP, REGON, KRS</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="regon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>REGON</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678901234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="krs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KRS</FormLabel>
                    <FormControl>
                      <Input placeholder="0000000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dane właściciela</CardTitle>
              <CardDescription>Osoba reprezentująca firmę</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerFirstName"
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
                name="ownerLastName"
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
                name="ownerName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Właściciel / Osoba reprezentująca (pełna nazwa)</FormLabel>
                    <FormControl>
                      <Input placeholder="Jan Kowalski" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email właściciela</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jan@firma.pl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon właściciela</FormLabel>
                    <FormControl>
                      <Input placeholder="+48 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adres</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Ulica</FormLabel>
                    <FormControl>
                      <Input placeholder="ul. Przykładowa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buildingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer budynku</FormLabel>
                    <FormControl>
                      <Input placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apartmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer lokalu</FormLabel>
                    <FormControl>
                      <Input placeholder="2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod pocztowy</FormLabel>
                    <FormControl>
                      <Input placeholder="00-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input placeholder="Warszawa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kraj</FormLabel>
                    <FormControl>
                      <Input placeholder="Polska" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontakt i dane bankowe</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon firmowy</FormLabel>
                    <FormControl>
                      <Input placeholder="+48 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer konta bankowego</FormLabel>
                    <FormControl>
                      <Input placeholder="PL00 0000 0000 0000 0000 0000 0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa banku</FormLabel>
                    <FormControl>
                      <Input placeholder="PKO Bank Polski" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Komunikacja</CardTitle>
              <CardDescription>Domyślne treści używane w dokumentach i emailach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="defaultEmailSignature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domyślny podpis email</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Z poważaniem,&#10;Jan Kowalski"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultDocumentFooter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domyślna stopka dokumentów</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Firma Sp. z o.o. | NIP: ... | ul. ..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Zapisywanie...' : 'Zapisz profil'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
