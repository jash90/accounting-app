import { useState } from 'react';

import { type Editor } from '@tiptap/react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAIConfiguration } from '@/lib/hooks/use-ai-agent';

import { AiGenerateDialog } from './ai-generate-dialog';

interface Props {
  editor: Editor | null;
  templateId: string;
  placeholders: string[];
  endpoint: 'documents' | 'offers';
  disabled?: boolean;
}

export function AiGenerateButton({ editor, templateId, placeholders, endpoint, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const { data: aiConfig, isPending } = useAIConfiguration();

  // Hide entirely when AI isn't configured for this company. Also hide while
  // the config query is loading so we don't flash the button on first paint.
  if (isPending || !aiConfig) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !editor}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-1.5 h-4 w-4" />
        AI
      </Button>
      <AiGenerateDialog
        open={open}
        onOpenChange={setOpen}
        editor={editor}
        templateId={templateId}
        placeholders={placeholders}
        endpoint={endpoint}
      />
    </>
  );
}
