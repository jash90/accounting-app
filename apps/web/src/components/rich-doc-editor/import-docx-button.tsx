import { useRef } from 'react';

import { type Editor } from '@tiptap/react';
import { FileUp } from 'lucide-react';
import mammoth from 'mammoth';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  editor: Editor | null;
  disabled?: boolean;
}

export function ImportDocxButton({ editor, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!editor) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: 'Nieobsługiwany format',
        description: 'Obsługiwane są tylko pliki .docx (zapisz w Word jako .docx).',
        variant: 'destructive',
      });
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value, messages } = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(value, { emitUpdate: true });
      if (messages && messages.length > 0) {
        toast({
          title: 'Import zakończony',
          description: 'Część formatowania została uproszczona.',
        });
      } else {
        toast({ title: 'Import zakończony', description: 'Dokument zaimportowany.' });
      }
    } catch (error) {
      toast({
        title: 'Błąd importu',
        description: error instanceof Error ? error.message : 'Nie udało się odczytać pliku.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !editor}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="mr-1.5 h-4 w-4" />
        Importuj .docx
      </Button>
    </>
  );
}
