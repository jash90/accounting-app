import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';

const STANDARD_PLACEHOLDERS = [
  { key: 'nazwa', label: 'Nazwa firmy' },
  { key: 'nip', label: 'NIP' },
  { key: 'regon', label: 'REGON' },
  { key: 'adres', label: 'Adres' },
  { key: 'ulica', label: 'Ulica' },
  { key: 'kod_pocztowy', label: 'Kod pocztowy' },
  { key: 'miasto', label: 'Miasto' },
  { key: 'kraj', label: 'Kraj' },
  { key: 'osoba_kontaktowa', label: 'Osoba kontaktowa' },
  { key: 'stanowisko', label: 'Stanowisko' },
  { key: 'email', label: 'Email' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'numer_oferty', label: 'Numer oferty' },
  { key: 'data_oferty', label: 'Data oferty' },
  { key: 'wazna_do', label: 'Ważna do' },
  { key: 'cena_netto', label: 'Cena netto' },
  { key: 'stawka_vat', label: 'Stawka VAT' },
  { key: 'cena_brutto', label: 'Cena brutto' },
  { key: 'kwota_vat', label: 'Kwota VAT' },
];

export function PlaceholderPicker() {
  const { toast } = useToast();

  const copyToClipboard = (key: string) => {
    const placeholder = `{{${key}}}`;
    navigator.clipboard.writeText(placeholder);
    toast({
      title: 'Skopiowano',
      description: `${placeholder} skopiowany do schowka`,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Placeholdery
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-h-80 overflow-y-auto" align="start">
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">Kliknij, aby skopiować placeholder</p>
          {STANDARD_PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              onClick={() => copyToClipboard(p.key)}
              className="flex items-center justify-between w-full text-left px-2 py-1 rounded text-sm hover:bg-accent"
            >
              <span className="text-muted-foreground">{p.label}</span>
              <code className="text-xs bg-muted px-1 rounded">{`{{${p.key}}}`}</code>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
