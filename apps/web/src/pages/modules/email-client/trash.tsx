import { BaseEmailList } from '@/components/email/base-email-list';
import { useEmailFolder, useEmailFolders } from '@/lib/hooks/use-email-client';

export default function EmailTrash() {
  const { data: folders } = useEmailFolders();
  const trashFolder =
    folders?.find((f) => f.specialUse === '\\Trash')?.path ??
    folders?.find(
      (f) =>
        f.path.toLowerCase().includes('trash') ||
        f.path.toLowerCase().includes('deleted') ||
        f.path.toLowerCase().includes('kosz')
    )?.path ??
    'Trash';
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
