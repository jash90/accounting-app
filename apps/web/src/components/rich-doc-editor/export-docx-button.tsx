import { useState } from 'react';

import { FileDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { downloadBlob } from '@/lib/utils/download';

interface Props {
  filename: string;
  fetchBlob: () => Promise<Blob>;
  disabled?: boolean;
}

export function ExportDocxButton({ filename, fetchBlob, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        try {
          const blob = await fetchBlob();
          await downloadBlob(blob, `${filename}.docx`);
          toast({ title: 'Pobrano', description: 'Plik został pobrany.' });
        } catch (error) {
          toast({
            title: 'Błąd eksportu',
            description: error instanceof Error ? error.message : 'Nie udało się pobrać pliku.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      Pobierz .docx
    </Button>
  );
}
