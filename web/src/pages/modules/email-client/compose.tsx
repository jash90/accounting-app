import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSendEmail, useCreateDraft } from '@/lib/hooks/use-email-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EmailCompose() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const sendEmail = useSendEmail();
  const createDraft = useCreateDraft();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const handleSend = async () => {
    if (!to || !subject) {
      toast({ title: 'Error', description: 'To and Subject are required', variant: 'destructive' });
      return;
    }

    try {
      await sendEmail.mutateAsync({
        to: to.split(',').map((e) => e.trim()),
        subject,
        text: content,
      });

      toast({ title: 'Success', description: 'Email sent successfully' });
      navigate('/modules/email-client');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send email', variant: 'destructive' });
    }
  };

  const handleSaveDraft = async () => {
    if (!to) {
      toast({ title: 'Error', description: 'To field is required', variant: 'destructive' });
      return;
    }

    try {
      await createDraft.mutateAsync({
        to: to.split(',').map((e) => e.trim()),
        subject,
        textContent: content,
      });

      toast({ title: 'Success', description: 'Draft saved' });
      navigate('/modules/email-client/drafts');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save draft', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/modules/email-client')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Compose Email</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            size="sm"
            disabled={createDraft.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handleSend}
            size="sm"
            disabled={sendEmail.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
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
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              placeholder="Type your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
