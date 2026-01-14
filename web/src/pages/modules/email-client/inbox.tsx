import { useInbox } from '@/lib/hooks/use-email-client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Mail, MailOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmailInbox() {
  const { data: emails, isLoading, refetch, isRefetching } = useInbox();

  if (isLoading) {
    return <div className="p-8">Loading inbox...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {emails?.length || 0} messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/modules/email-client/compose">
            <Button size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!emails || emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emails in inbox</p>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map((email) => (
              <div
                key={email.uid}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {email.from[0]?.name || email.from[0]?.address}
                      </p>
                      {!email.flags.includes('\\Seen') && (
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {email.text?.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(email.date).toLocaleDateString('pl-PL')}
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
