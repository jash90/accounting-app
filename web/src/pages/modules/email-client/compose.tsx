import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import {
  useSendEmail,
  useCreateDraft,
  useDraft,
  useUpdateDraft,
  useGenerateAiDraftStream,
  useUploadAttachment,
} from '@/lib/hooks/use-email-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/components/ui/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [attachments, setAttachments] = useState<Array<{ path: string; filename: string; size: number }>>([]);
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
          title: 'Error',
          description: `File "${file.name}" exceeds 10MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        const result = await uploadAttachment.mutateAsync(file);
        setAttachments((prev) => [...prev, result]);
        toast({
          title: 'Success',
          description: `"${file.name}" uploaded`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to upload "${file.name}"`,
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
        title: 'Error',
        description: 'To and Subject are required',
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

      toast({ title: 'Success', description: 'Email sent successfully' });
      emailNav.toInbox();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!to) {
      toast({
        title: 'Error',
        description: 'To field is required',
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
        toast({ title: 'Success', description: 'Draft updated' });
      } else {
        // Create new draft
        const newDraft = await createDraft.mutateAsync({
          to: to.split(',').map((e) => e.trim()),
          subject,
          textContent: content,
        });
        // Navigate to edit the new draft so subsequent saves are updates
        emailNav.toComposeWithQuery(`draftId=${newDraft.id}`, { replace: true });
        toast({ title: 'Success', description: 'Draft saved' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    }
  };

  if (isDraftLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">
            Ładowanie szkicu...
          </p>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => emailNav.toInbox()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {draftId ? 'Edit Draft' : 'Compose Email'}
          </h1>
          {existingDraft?.isAiGenerated && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </span>
          )}
          {attachments.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {draftId ? 'Update Draft' : 'Save Draft'}
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
            Send
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          <Collapsible open={showCcBcc} onOpenChange={setShowCcBcc}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {showCcBcc ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-2">
              <div>
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bcc">BCC</Label>
                <Input
                  id="bcc"
                  placeholder="bcc@example.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
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
                className={`font-mono ${(aiStream.isStreaming || locationState?.aiGenerate) ? 'border-purple-300 focus:border-purple-500' : ''}`}
                disabled={aiStream.isStreaming || (locationState?.aiGenerate && !content)}
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <Label>Attachments</Label>

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
                    ? 'Uploading...'
                    : 'Drag and drop files here, or click to browse'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Maximum file size: 10MB
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
