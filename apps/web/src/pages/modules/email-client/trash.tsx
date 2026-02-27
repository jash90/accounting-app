import { BaseEmailList } from '@/components/email/base-email-list';
import { useEmailFolder, useEmailFolders } from '@/lib/hooks/use-email-client';

// Helper to find the Trash folder name from available folders
function findTrashFolder(folders: string[] | undefined): string {
  if (!folders) return 'Trash';

  const trashNames = [
    'Trash',
    'Deleted',
    'Deleted Items',
    'Deleted Messages',
    '[Gmail]/Trash',
    'Kosz',
    'INBOX.Trash',
    'INBOX/Trash',
  ];

  for (const name of trashNames) {
    const found = folders.find((f) => f.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }

  const partial = folders.find(
    (f) =>
      f.toLowerCase().includes('trash') ||
      f.toLowerCase().includes('deleted') ||
      f.toLowerCase().includes('kosz')
  );
  return partial || 'Trash';
}

export default function EmailTrash() {
  const { data: folders } = useEmailFolders();
  const trashFolder = findTrashFolder(folders);
  const { data: emails, isLoading, refetch, isRefetching, error } = useEmailFolder(trashFolder);

  return (
    <BaseEmailList
      title="Kosz"
      emails={emails}
      isLoading={isLoading}
      isRefetching={isRefetching}
      refetch={refetch}
      emptyMessage="Kosz jest pusty"
      error={error}
      currentMailbox={trashFolder}
      showMoveAction={true}
    />
  );
}
