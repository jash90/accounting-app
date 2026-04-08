import { useState } from 'react';

import { type Editor } from '@tiptap/react';
import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { offerTemplatesApi } from '@/lib/api/endpoints/offers';
import { getApiErrorMessage } from '@/lib/utils/query-filters';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  templateId: string;
  placeholders: string[];
  endpoint: 'documents' | 'offers';
}

export function AiGenerateDialog({
  open,
  onOpenChange,
  editor,
  templateId,
  placeholders,
  endpoint,
}: Props) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [replaceMode, setReplaceMode] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!editor) return;
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast({
        title: 'Zbyt krótki prompt',
        description: 'Opisz co chcesz wygenerować w przynajmniej 3 znakach.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result =
        endpoint === 'documents'
          ? await documentsApi.aiGenerate(templateId, trimmed)
          : await offerTemplatesApi.aiGenerate(templateId, trimmed);

      if (replaceMode) {
        editor.commands.setContent(result.html, { emitUpdate: true });
      } else {
        editor.commands.insertContent(result.html);
      }

      toast({
        title: 'Treść wygenerowana',
        description: `Użyto ${result.totalTokens} tokenów (${result.inputTokens} wejściowych + ${result.outputTokens} wyjściowych).`,
      });
      setPrompt('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Błąd generowania',
        description: getApiErrorMessage(error, 'Nie udało się wygenerować treści.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            Wygeneruj dokument z AI
          </DialogTitle>
          <DialogDescription>
            Opisz dokument który chcesz wygenerować. AI utworzy treść w języku polskim, sformatowaną
            pod edytor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">Twój opis</Label>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="np. Krótka umowa o świadczenie usług księgowych dla spółki z o.o. z miesięczną opłatą i terminem wypowiedzenia 30 dni"
              rows={6}
              maxLength={2000}
              disabled={loading}
              autoFocus
            />
            <p className="text-muted-foreground text-xs">{prompt.length} / 2000 znaków</p>
          </div>

          {placeholders.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">
                Dostępne placeholdery (AI może ich użyć w odpowiedzi)
              </Label>
              <div className="flex flex-wrap gap-1">
                {placeholders.slice(0, 20).map((key) => (
                  <code
                    key={key}
                    className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                  >{`{{${key}}}`}</code>
                ))}
                {placeholders.length > 20 && (
                  <span className="text-muted-foreground text-xs">
                    + {placeholders.length - 20} więcej
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ai-replace"
              checked={replaceMode}
              onCheckedChange={(v) => setReplaceMode(v === true)}
              disabled={loading}
            />
            <Label htmlFor="ai-replace" className="text-sm font-normal">
              Zastąp całą obecną treść (zamiast wstawić w miejscu kursora)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button onClick={handleGenerate} disabled={loading || prompt.trim().length < 3}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Wygeneruj
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
