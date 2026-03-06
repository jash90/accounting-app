import { BaseEmailList } from '@/components/email/base-email-list';
import { useEmailFolder, useEmailFolders } from '@/lib/hooks/use-email-client';

export default function EmailSent() {
  const { data: folders } = useEmailFolders();
  const sentFolder =
    folders?.find((f) => f.specialUse === '\\Sent')?.path ??
    folders?.find(
      (f) => f.path.toLowerCase().includes('sent') || f.path.toLowerCase().includes('wysłan')
    )?.path ??
    'Sent';
  const { data: emails, isLoading, refetch, isRefetching, error } = useEmailFolder(sentFolder);

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
