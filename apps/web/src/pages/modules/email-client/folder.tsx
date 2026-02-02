import { useParams } from 'react-router-dom';
import { BaseEmailList } from '@/components/email/base-email-list';
import { useFolder } from '@/lib/hooks/use-email-client';

/**
 * Get display name for folder title
 * Maps internal folder names to Polish UI labels
 */
function getFolderDisplayName(folderName: string): string {
  if (folderName === 'INBOX') return 'Odebrane';
  return folderName;
}

export default function EmailFolder() {
  const { folderName } = useParams<{ folderName: string }>();
  const decodedFolderName = folderName ? decodeURIComponent(folderName) : '';

  const { data: emails, isLoading, refetch, isRefetching, error } = useFolder(decodedFolderName);

  return (
    <BaseEmailList
      title={getFolderDisplayName(decodedFolderName)}
      emails={emails}
      isLoading={isLoading}
      isRefetching={isRefetching}
      refetch={refetch}
      emptyMessage="Brak wiadomości w tym folderze"
      error={error}
    />
  );
}
