import { useState, useEffect } from 'react';

import { useLocation, useSearchParams } from 'react-router-dom';

import {
  Send,
  Save,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Paperclip,
  X,
  FileIcon,
  Upload,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  useSendEmail,
  useCreateDraft,
  useDraft,
  useUpdateDraft,
  useGenerateAiDraftStream,
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

export default function EmailCompose() {
  const emailNav = useEmailClientNavigation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get draftId from URL query params
  const draftId = searchParams.get('draftId');
  const locationState = location.state as LocationState | null;

  // Hooks
  const sendEmail = useSendEmail();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const aiStream = useGenerateAiDraftStream();
  const uploadAttachment = useUploadAttachment();
  const { data: existingDraft, isLoading: isDraftLoading } = useDraft(draftId || undefined);

  // Form state
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ path: string; filename: string; size: number }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync streaming content to textarea
  useEffect(() => {
    if (aiStream.content) {
      setContent(aiStream.content);
    }
  }, [aiStream.content]);

  // Navigate to draft when streaming completes
  useEffect(() => {
    if (aiStream.draftId && !aiStream.isStreaming) {
      emailNav.toComposeWithQuery(`draftId=${aiStream.draftId}`, { replace: true });
      toast({ title: 'Sukces', description: 'Odpowiedź AI została wygenerowana' });
      aiStream.reset();
    }
  }, [aiStream.draftId, aiStream.isStreaming]);

  // Show error if streaming fails
  useEffect(() => {
    if (aiStream.error) {
      toast({
        title: 'Błąd',
        description: aiStream.error,
        variant: 'destructive',
      });
    }
  }, [aiStream.error]);

  // Load draft data or reply state
  useEffect(() => {
    if (existingDraft) {
      // Loading existing draft
      setTo(existingDraft.to?.join(', ') || '');
      setCc(existingDraft.cc?.join(', ') || '');
      setSubject(existingDraft.subject || '');
      setContent(existingDraft.textContent || '');
      if (existingDraft.cc && existingDraft.cc.length > 0) {
        setShowCcBcc(true);
      }
    } else if (locationState) {
      // Loading from reply state
      if (locationState.to) {
        setTo(locationState.to);
      }
      if (locationState.subject) {
        setSubject(locationState.subject);
      }
      // Handle AI generation
      if (locationState.aiGenerate && locationState.messageUid) {
        handleGenerateAiReply(locationState.messageUid);
      }
    }
  }, [existingDraft, locationState]);

  const handleGenerateAiReply = (messageUid: number) => {
    // Clear content first to show skeleton
    setContent('');
    // Start streaming - text will appear progressively in textarea
    aiStream.startStream({ messageUid });
  };

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
      } catch (error) {
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
      emailNav.toInbox();
    } catch (error) {
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
        emailNav.toComposeWithQuery(`draftId=${newDraft.id}`, { replace: true });
        toast({ title: 'Sukces', description: 'Szkic zapisany' });
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać szkicu',
        variant: 'destructive',
      });
    }
  };

  if (isDraftLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Ładowanie szkicu...</p>
        </div>
      </div>
    );
  }

  const isSaving = createDraft.isPending || updateDraft.isPending;
  const isSending = sendEmail.isPending;
  const isUploading = uploadAttachment.isPending;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => emailNav.toInbox()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{draftId ? 'Edytuj szkic' : 'Nowa wiadomość'}</h1>
          {existingDraft?.isAiGenerated && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Wygenerowane przez AI
            </span>
          )}
          {attachments.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachments.length} {attachments.length === 1 ? 'załącznik' : 'załączniki'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} variant="outline" size="sm" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {draftId ? 'Zapisz zmiany' : 'Zapisz szkic'}
          </Button>
          {locationState?.replyTo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAiReply(locationState.replyTo!.uid)}
              disabled={aiStream.isStreaming}
            >
              {aiStream.isStreaming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Wygeneruj AI
            </Button>
          )}
          <Button onClick={handleSend} size="sm" disabled={isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Wyślij
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <Label htmlFor="to">Do</Label>
            <Input
              id="to"
              placeholder="adresat@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Oddziel wiele adresów przecinkami</p>
          </div>

          <Collapsible open={showCcBcc} onOpenChange={setShowCcBcc}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {showCcBcc ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                {showCcBcc ? 'Ukryj DW/UDW' : 'Dodaj DW/UDW'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-2">
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
            <div className="flex items-center gap-2 mb-1.5">
              <Label htmlFor="content">Wiadomość</Label>
              {(aiStream.isStreaming || (locationState?.aiGenerate && !content)) && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  Generowanie AI...
                </span>
              )}
            </div>
            <div className="relative">
              {(aiStream.isStreaming || locationState?.aiGenerate) && !content && (
                <div className="absolute inset-0 bg-background rounded-md border p-3 space-y-2 z-10">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
                </div>
              )}
              <Textarea
                id="content"
                placeholder="Wpisz treść wiadomości..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className={`font-mono ${aiStream.isStreaming || locationState?.aiGenerate ? 'border-purple-300 focus:border-purple-500' : ''}`}
                disabled={aiStream.isStreaming || (locationState?.aiGenerate && !content)}
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <Label>Załączniki</Label>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isUploading
                    ? 'Przesyłanie...'
                    : 'Przeciągnij i upuść pliki tutaj lub kliknij, aby przeglądać'}
                </span>
                <span className="text-xs text-muted-foreground">
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
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
