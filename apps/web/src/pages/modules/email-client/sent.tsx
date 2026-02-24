import { BaseEmailList } from '@/components/email/base-email-list';
import { useFolder, useFolders } from '@/lib/hooks/use-email-client';

// Helper to find the Sent folder name from available folders
function findSentFolder(folders: string[] | undefined): string {
  if (!folders) return 'Sent';

  const sentNames = [
    'Sent',
    'Sent Items',
    'Sent Mail',
    '[Gmail]/Sent Mail',
    'Wysłane',
    'INBOX.Sent',
    'INBOX/Sent',
  ];

  for (const name of sentNames) {
    const found = folders.find((f) => f.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }

  const partial = folders.find(
    (f) => f.toLowerCase().includes('sent') || f.toLowerCase().includes('wysłan')
  );
  return partial || 'Sent';
}

export default function EmailSent() {
  const { data: folders } = useFolders();
  const sentFolder = findSentFolder(folders);
  const { data: emails, isLoading, refetch, isRefetching, error } = useFolder(sentFolder);

  return (
    <BaseEmailList
      title="Wysłane"
      emails={emails}
      isLoading={isLoading}
      isRefetching={isRefetching}
      refetch={refetch}
      emptyMessage="Brak wysłanych wiadomości"
      error={error}
      currentMailbox={sentFolder}
      showMoveAction={false}
    />
  );
}
