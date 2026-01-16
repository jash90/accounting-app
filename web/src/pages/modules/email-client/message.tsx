import { useParams, Link } from 'react-router-dom';
import { useEmail, useMarkAsRead, useDeleteEmails } from '@/lib/hooks/use-email-client';
import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Reply,
  Trash2,
  Mail,
  CheckCheck,
  Paperclip,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { EmailDetailSkeleton } from './components/email-detail-skeleton';

export default function EmailMessage() {
  const { uid } = useParams<{ uid: string }>();
  const emailNav = useEmailClientNavigation();
  const { toast } = useToast();
  const emailUid = uid ? parseInt(uid, 10) : undefined;

  const { data: email, isLoading, error } = useEmail(emailUid);
  const markAsRead = useMarkAsRead();
  const deleteEmails = useDeleteEmails();

  // Mark as read when email loads
  useEffect(() => {
    if (email && emailUid && !email.flags.includes('\\Seen')) {
      markAsRead.mutate([emailUid]);
    }
  }, [email, emailUid]);

  const handleDelete = async () => {
    if (!emailUid) return;

    try {
      await deleteEmails.mutateAsync([emailUid]);
      toast({ title: 'Success', description: 'Email deleted' });
      emailNav.toInbox();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete email',
        variant: 'destructive',
      });
    }
  };

  const handleReply = () => {
    // Navigate to compose with reply info in state
    emailNav.toCompose({
      replyTo: email,
      to: email?.from[0]?.address,
      subject: `Re: ${email?.subject || ''}`,
    });
  };

  const handleAiReply = () => {
    // Navigate to compose with AI reply request
    emailNav.toCompose({
      replyTo: email,
      to: email?.from[0]?.address,
      subject: `Re: ${email?.subject || ''}`,
      aiGenerate: true,
      messageUid: emailUid,
    });
  };

  if (isLoading) {
    return <EmailDetailSkeleton />;
  }

  if (error || !email) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Mail className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">Email not found</p>
        <Link to={emailNav.getInboxPath()}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
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

  const formatDate = (date: Date) => {
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => emailNav.toInbox()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-md">
            {email.subject || '(No subject)'}
          </h1>
          {isUnread && (
            <Badge variant="secondary" className="ml-2">
              Unread
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReply}>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm" onClick={handleAiReply}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Reply
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteEmails.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Email Headers */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-4">
              <span className="text-sm text-muted-foreground w-16 shrink-0">From:</span>
              <span className="text-sm font-medium">
                {email.from.map(formatEmailAddress).join(', ')}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-sm text-muted-foreground w-16 shrink-0">To:</span>
              <span className="text-sm">
                {email.to.map(formatEmailAddress).join(', ')}
              </span>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div className="flex items-start gap-4">
                <span className="text-sm text-muted-foreground w-16 shrink-0">CC:</span>
                <span className="text-sm">
                  {email.cc.map(formatEmailAddress).join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-start gap-4">
              <span className="text-sm text-muted-foreground w-16 shrink-0">Date:</span>
              <span className="text-sm">{formatDate(email.date)}</span>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-sm text-muted-foreground w-16 shrink-0">Subject:</span>
              <span className="text-sm font-medium">{email.subject || '(No subject)'}</span>
            </div>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                    >
                      {attachment.filename || `Attachment ${index + 1}`}
                      {attachment.size && (
                        <span className="ml-1 text-muted-foreground">
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
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {email.html ? (
              // HTML content - render safely
              // Note: In production, use DOMPurify to sanitize HTML
              <div
                className="email-html-content"
                dangerouslySetInnerHTML={{ __html: email.html }}
              />
            ) : (
              // Plain text content
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {email.text}
              </pre>
            )}
          </div>

          {/* Mark as read indicator */}
          <div className="mt-6 pt-4 border-t flex items-center gap-2 text-muted-foreground">
            <CheckCheck className="h-4 w-4" />
            <span className="text-xs">
              {email.flags.includes('\\Seen') ? 'Read' : 'Marked as read'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
