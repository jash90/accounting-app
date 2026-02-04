import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLocation, useSearchParams } from 'react-router-dom';

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileIcon,
  Loader2,
  Paperclip,
  Save,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateDraft,
  useDraft,
  useGenerateAiDraftStream,
  useSendEmail,
  useUpdateDraft,
  useUploadAttachment,
} from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';

interface LocationState {
  replyTo?: {
    uid: number;
    subject: string;
    from: { address: string; name?: string }[];
    text?: string;
  };
  to?: string;
  subject?: string;
  aiGenerate?: boolean;
  messageUid?: number;
}

interface EmailDraft {
  id: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  textContent?: string;
  isAiGenerated?: boolean;
}

interface AiStreamState {
  content: string;
  draftId: string | null;
  isStreaming: boolean;
  error: string | null;
  startStream: (params: { messageUid: number }) => void;
  reset: () => void;
}

interface EmailComposeFormProps {
  initialData: {
    to: string;
    cc: string;
    subject: string;
    content: string;
    showCcBcc: boolean;
  };
  draftId: string | null;
  existingDraft: EmailDraft | undefined;
  aiStream: AiStreamState;
  locationState: LocationState | null;
  onNavigateToInbox: () => void;
  onNavigateToDraft: (draftId: string, options?: { replace?: boolean }) => void;
}

function EmailComposeForm({
  initialData,
  draftId,
  existingDraft,
  aiStream,
  locationState,
  onNavigateToInbox,
  onNavigateToDraft,
}: EmailComposeFormProps) {
  const { toast } = useToast();

  // Destructure aiStream properties for explicit dependencies
  const {
    content: aiStreamContent,
    draftId: aiStreamDraftId,
    isStreaming: aiStreamIsStreaming,
    error: aiStreamError,
    startStream,
    reset: resetAiStream,
  } = aiStream;

  // Hooks
  const sendEmail = useSendEmail();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const uploadAttachment = useUploadAttachment();

  // Form state - initialized from props (no useEffect needed due to key prop in parent)
  const [to, setTo] = useState(initialData.to);
  const [cc, setCc] = useState(initialData.cc);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialData.subject);
  const [content, setContent] = useState(initialData.content);
  const [showCcBcc, setShowCcBcc] = useState(initialData.showCcBcc);
  const [attachments, setAttachments] = useState<
    Array<{ path: string; filename: string; size: number }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  // Ref to track if AI generation was triggered to prevent re-triggering
  const aiGenerateTriggeredRef = useRef(false);

  // Derive display content: use streaming content during AI generation, otherwise use editable content
  // This replaces the useEffect that was syncing aiStreamContent to content state
  const displayContent = aiStreamIsStreaming && aiStreamContent ? aiStreamContent : content;

  // Navigate to draft when streaming completes
  // Note: No need to sync content here - navigation causes remount and draft is loaded from server
  useEffect(() => {
    if (aiStreamDraftId && !aiStreamIsStreaming) {
      onNavigateToDraft(aiStreamDraftId, { replace: true });
      toast({ title: 'Sukces', description: 'Odpowiedź AI została wygenerowana' });
      resetAiStream();
    }
  }, [aiStreamDraftId, aiStreamIsStreaming, resetAiStream, onNavigateToDraft, toast]);

  // Show error if streaming fails
  useEffect(() => {
    if (aiStreamError) {
      toast({
        title: 'Błąd',
        description: aiStreamError,
        variant: 'destructive',
      });
    }
  }, [aiStreamError, toast]);

  const handleGenerateAiReply = useCallback(
    (messageUid: number) => {
      // Clear content first to show skeleton
      setContent('');
      // Start streaming - text will appear progressively in textarea
      startStream({ messageUid });
    },
    [startStream]
  );

  // Trigger AI generation on mount if requested via navigation state
  // Uses ref to ensure this only runs once per component mount
  // Note: Content is already empty via initialData when aiGenerate is used
  useEffect(() => {
    if (locationState?.aiGenerate && locationState.messageUid && !aiGenerateTriggeredRef.current) {
      aiGenerateTriggeredRef.current = true;
      startStream({ messageUid: locationState.messageUid });
    }
  }, [locationState?.aiGenerate, locationState?.messageUid, startStream]);

  // Attachment handlers
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Błąd',
          description: `Plik "${file.name}" przekracza limit 10MB`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        const result = await uploadAttachment.mutateAsync(file);
        setAttachments((prev) => [...prev, result]);
        toast({
          title: 'Sukces',
          description: `Przesłano "${file.name}"`,
        });
      } catch {
        toast({
          title: 'Błąd',
          description: `Nie udało się przesłać "${file.name}"`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!to || !subject) {
      toast({
        title: 'Błąd',
        description: 'Pola Do i Temat są wymagane',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendEmail.mutateAsync({
        to: to.split(',').map((e) => e.trim()),
        subject,
        text: content,
        ...(cc && { cc: cc.split(',').map((e) => e.trim()) }),
        ...(bcc && { bcc: bcc.split(',').map((e) => e.trim()) }),
        ...(attachments.length > 0 && { attachments: attachments.map((a) => a.path) }),
      });

      toast({ title: 'Sukces', description: 'Wiadomość została wysłana' });
      onNavigateToInbox();
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać wiadomości',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!to) {
      toast({
        title: 'Błąd',
        description: 'Pole Do jest wymagane',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (draftId) {
        // Update existing draft
        await updateDraft.mutateAsync({
          draftId,
          data: {
            to: to.split(',').map((e) => e.trim()),
            cc: cc ? cc.split(',').map((e) => e.trim()) : undefined,
            bcc: bcc ? bcc.split(',').map((e) => e.trim()) : undefined,
            subject,
            textContent: content,
          },
        });
        toast({ title: 'Sukces', description: 'Szkic zaktualizowany' });
      } else {
        // Create new draft
        const newDraft = await createDraft.mutateAsync({
          to: to.split(',').map((e) => e.trim()),
          subject,
          textContent: content,
        });
        // Navigate to edit the new draft so subsequent saves are updates
        onNavigateToDraft(newDraft.id, { replace: true });
        toast({ title: 'Sukces', description: 'Szkic zapisany' });
      }
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać szkicu',
        variant: 'destructive',
      });
    }
  };

  const isSaving = createDraft.isPending || updateDraft.isPending;
  const isSending = sendEmail.isPending;
  const isUploading = uploadAttachment.isPending;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onNavigateToInbox}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{draftId ? 'Edytuj szkic' : 'Nowa wiadomość'}</h1>
          {existingDraft?.isAiGenerated && (
            <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
              <Sparkles className="h-3 w-3" />
              Wygenerowane przez AI
            </span>
          )}
          {attachments.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              <Paperclip className="h-3 w-3" />
              {attachments.length} {attachments.length === 1 ? 'załącznik' : 'załączniki'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} variant="outline" size="sm" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {draftId ? 'Zapisz zmiany' : 'Zapisz szkic'}
          </Button>
          {locationState?.replyTo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAiReply(locationState.replyTo!.uid)}
              disabled={aiStreamIsStreaming}
            >
              {aiStreamIsStreaming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Wygeneruj AI
            </Button>
          )}
          <Button onClick={handleSend} size="sm" disabled={isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Wyślij
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div>
            <Label htmlFor="to">Do</Label>
            <Input
              id="to"
              placeholder="adresat@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">Oddziel wiele adresów przecinkami</p>
          </div>

          <Collapsible open={showCcBcc} onOpenChange={setShowCcBcc}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {showCcBcc ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )}
                {showCcBcc ? 'Ukryj DW/UDW' : 'Dodaj DW/UDW'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-4">
              <div>
                <Label htmlFor="cc">DW (Do wiadomości)</Label>
                <Input
                  id="cc"
                  placeholder="dw@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bcc">UDW (Ukryta kopia)</Label>
                <Input
                  id="bcc"
                  placeholder="udw@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div>
            <Label htmlFor="subject">Temat</Label>
            <Input
              id="subject"
              placeholder="Temat wiadomości"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Label htmlFor="content">Wiadomość</Label>
              {(aiStreamIsStreaming || (locationState?.aiGenerate && !content)) && (
                <span className="flex animate-pulse items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                  <Sparkles className="h-3 w-3" />
                  Generowanie AI...
                </span>
              )}
            </div>
            <div className="relative">
              {(aiStreamIsStreaming || locationState?.aiGenerate) && !displayContent && (
                <div className="bg-background absolute inset-0 z-10 space-y-2 rounded-md border p-3">
                  <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-full animate-pulse rounded" />
                  <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-4/5 animate-pulse rounded" />
                </div>
              )}
              <Textarea
                id="content"
                placeholder="Wpisz treść wiadomości..."
                value={displayContent}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className={`font-mono ${aiStreamIsStreaming || locationState?.aiGenerate ? 'border-purple-300 focus:border-purple-500' : ''}`}
                disabled={aiStreamIsStreaming || (locationState?.aiGenerate && !displayContent)}
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <Label>Załączniki</Label>

            {/* Drag & Drop Zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Strefa upuszczania załączników. Naciśnij Enter lub Spację aby otworzyć wybór plików."
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  document.getElementById('file-upload')?.click();
                }
              }}
              className={`focus:ring-ring cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="text-muted-foreground h-8 w-8" />
                )}
                <span className="text-muted-foreground text-sm">
                  {isUploading
                    ? 'Przesyłanie...'
                    : 'Przeciągnij i upuść pliki tutaj lub kliknij, aby przeglądać'}
                </span>
                <span className="text-muted-foreground text-xs">
                  Maksymalny rozmiar pliku: 10MB
                </span>
              </label>
            </div>

            {/* Uploaded Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="text-muted-foreground h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{attachment.filename}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailCompose() {
  const emailNav = useEmailClientNavigation();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get draftId from URL query params
  const draftId = searchParams.get('draftId');
  const locationState = location.state as LocationState | null;

  // Fetch existing draft
  const aiStream = useGenerateAiDraftStream();
  const { data: existingDraft, isLoading: isDraftLoading } = useDraft(draftId || undefined);

  // Compute initial form data from draft or location state
  const initialFormData = useMemo(() => {
    if (existingDraft) {
      return {
        to: existingDraft.to?.join(', ') || '',
        cc: existingDraft.cc?.join(', ') || '',
        subject: existingDraft.subject || '',
        content: existingDraft.textContent || '',
        showCcBcc: (existingDraft.cc?.length ?? 0) > 0,
      };
    }
    if (locationState) {
      return {
        to: locationState.to || '',
        cc: '',
        subject: locationState.subject || '',
        content: '',
        showCcBcc: false,
      };
    }
    return { to: '', cc: '', subject: '', content: '', showCcBcc: false };
  }, [existingDraft, locationState]);

  // Key to reset form when draft or reply context changes
  const formKey = existingDraft?.id ?? locationState?.replyTo?.uid ?? 'new';

  const handleNavigateToDraft = useCallback(
    (newDraftId: string, options?: { replace?: boolean }) => {
      emailNav.toComposeWithQuery(`draftId=${newDraftId}`, options);
    },
    [emailNav]
  );

  if (isDraftLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-2 text-sm">Ładowanie szkicu...</p>
        </div>
      </div>
    );
  }

  return (
    <EmailComposeForm
      key={formKey}
      initialData={initialFormData}
      draftId={draftId}
      existingDraft={existingDraft}
      aiStream={aiStream}
      locationState={locationState}
      onNavigateToInbox={() => emailNav.toInbox()}
      onNavigateToDraft={handleNavigateToDraft}
    />
  );
}
