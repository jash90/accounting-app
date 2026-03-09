import { useEffect } from 'react';

import { Link, useParams } from 'react-router-dom';

import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  CheckCheck,
  Mail,
  Paperclip,
  Reply,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  useDeleteEmails,
  useDownloadEmailAttachment,
  useEmailMessage,
  useMarkEmailsAsRead,
  useUpdateEmailFlags,
} from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';

import { EmailDetailSkeleton } from './components/email-detail-skeleton';

export default function EmailMessage() {
  'use no memo';
  const { uid } = useParams<{ uid: string }>();
  const emailNav = useEmailClientNavigation();
  const { toast } = useToast();
  const emailUid = uid ? parseInt(uid, 10) : undefined;

  const { data: email, isLoading, error } = useEmailMessage(emailUid);
  // Destructure the stable `mutate` function to avoid the full mutation object
  // in the effect deps (the object changes every render, but mutate is stable).
  const { mutate: markEmailsAsRead } = useMarkEmailsAsRead();
  const deleteEmails = useDeleteEmails();

  // Mark as read when email loads
  useEffect(() => {
    if (email && emailUid && !email.flags.includes('\\Seen')) {
      markEmailsAsRead([emailUid]);
    }
  }, [email, emailUid, markEmailsAsRead]);

  const handleDelete = async () => {
    if (!emailUid) return;

    try {
      await deleteEmails.mutateAsync([emailUid]);
      toast({ title: 'Sukces', description: 'Wiadomość usunięta' });
      emailNav.toInbox();
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wiadomości',
        variant: 'destructive',
      });
    }
  };

  const handleReply = () => {
    // Navigate to compose with reply info in state
    emailNav.toCompose({
      replyTo: email,
      to: email?.from?.[0]?.address || '',
      subject: `Re: ${email?.subject || ''}`,
    });
  };

  const handleAiReply = () => {
    // Navigate to compose with AI reply request
    emailNav.toCompose({
      replyTo: email,
      to: email?.from?.[0]?.address || '',
      subject: `Re: ${email?.subject || ''}`,
      aiGenerate: true,
      messageUid: emailUid,
    });
  };

  const updateFlags = useUpdateEmailFlags();
  const downloadAttachment = useDownloadEmailAttachment();

  const isStarred = email?.flags.includes('\\Flagged') ?? false;

  const handleToggleStar = async () => {
    if (!emailUid) return;
    const addFlags = isStarred ? undefined : ['\\Flagged'];
    const removeFlags = isStarred ? ['\\Flagged'] : undefined;
    try {
      await updateFlags.mutateAsync({ uid: emailUid, add: addFlags, remove: removeFlags });
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować flagi',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAttachment = async (filename: string) => {
    if (!emailUid || !filename) return;
    try {
      await downloadAttachment.mutateAsync({ uid: emailUid, filename });
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać załącznika',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <EmailDetailSkeleton />;
  }

  if (error || !email) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Mail className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <p className="text-muted-foreground mb-4">Nie znaleziono wiadomości</p>
        <Link to={emailNav.getInboxPath()}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do skrzynki
          </Button>
        </Link>
      </div>
    );
  }

  const formatEmailAddress = (addr: { address: string; name?: string }) => {
    if (addr.name) {
      return `${addr.name} <${addr.address}>`;
    }
    return addr.address;
  };

  const formatDateTimeLocalized = (date: Date) => {
    return new Date(date).toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUnread = !email.flags.includes('\\Seen');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => emailNav.toInbox()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{email.subject || '(Brak tematu)'}</h1>
          {isUnread && (
            <Badge variant="secondary" className="ml-2">
              Nieprzeczytana
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReply}>
            <Reply className="mr-2 h-4 w-4" />
            Odpowiedz
          </Button>
          <Button variant="outline" size="sm" onClick={handleAiReply}>
            <Sparkles className="mr-2 h-4 w-4" />
            Wygeneruj AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStar}
            disabled={updateFlags.isPending}
          >
            <Star
              className={`mr-2 h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
            {isStarred ? 'Usuń gwiazdkę' : 'Dodaj gwiazdkę'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteEmails.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-auto p-6">
        <div>
          {/* Email Headers */}
          <div className="mb-6 space-y-3">
            <div className="flex items-start gap-4">
              <span className="text-muted-foreground w-16 shrink-0 text-sm">Od:</span>
              <span className="text-sm font-medium">
                {email.from.map(formatEmailAddress).join(', ')}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-muted-foreground w-16 shrink-0 text-sm">Do:</span>
              <span className="text-sm">{email.to.map(formatEmailAddress).join(', ')}</span>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-16 shrink-0 text-sm">DW:</span>
                <span className="text-sm">{email.cc.map(formatEmailAddress).join(', ')}</span>
              </div>
            )}
            <div className="flex items-start gap-4">
              <span className="text-muted-foreground w-16 shrink-0 text-sm">Data:</span>
              <span className="text-sm">{formatDateTimeLocalized(email.date)}</span>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-muted-foreground w-16 shrink-0 text-sm">Temat:</span>
              <span className="text-sm font-medium">{email.subject || '(Brak tematu)'}</span>
            </div>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Paperclip className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">
                    {email.attachments.length}{' '}
                    {email.attachments.length === 1 ? 'Załącznik' : 'Załączniki'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment, index) => (
                    <Badge
                      key={attachment.filename || `attachment-${index}`}
                      variant="outline"
                      className="hover:bg-muted cursor-pointer"
                      onClick={() =>
                        attachment.filename && handleDownloadAttachment(attachment.filename)
                      }
                    >
                      {attachment.filename || `Załącznik ${index + 1}`}
                      {attachment.size && (
                        <span className="text-muted-foreground ml-1">
                          ({Math.round(attachment.size / 1024)}KB)
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />

          {/* Email Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {email.html ? (
              // HTML content - sanitized with DOMPurify to prevent XSS attacks
              <div
                className="email-html-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.html) }}
              />
            ) : (
              // Plain text content
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                {email.text}
              </pre>
            )}
          </div>

          {/* Mark as read indicator */}
          <div className="text-muted-foreground mt-6 flex items-center gap-2 border-t pt-4">
            <CheckCheck className="h-4 w-4" />
            <span className="text-xs">
              {email.flags.includes('\\Seen') ? 'Przeczytana' : 'Oznaczona jako przeczytana'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
