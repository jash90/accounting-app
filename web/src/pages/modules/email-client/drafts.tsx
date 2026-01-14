import { useDrafts, useSendDraft } from '@/lib/hooks/use-email-client';
import { Button } from '@/components/ui/button';
import { Send, Trash, Edit, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function EmailDrafts() {
  const { data: drafts, isLoading } = useDrafts();
  const sendDraft = useSendDraft();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendDraft = async (draftId: string) => {
    try {
      await sendDraft.mutateAsync(draftId);
      toast({ title: 'Success', description: 'Draft sent successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send draft', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading drafts...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Email Drafts</h1>
        <p className="text-sm text-muted-foreground">
          {drafts?.length || 0} saved drafts
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {!drafts || drafts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No drafts saved</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/modules/email-client/compose')}
            >
              Compose New Email
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        To: {draft.to.join(', ')}
                      </p>
                      {draft.isAiGenerated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">
                      {draft.subject || '(No subject)'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {draft.textContent.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated: {new Date(draft.updatedAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/modules/email-client/compose?draftId=${draft.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendDraft(draft.id)}
                      disabled={sendDraft.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
