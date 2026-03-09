import { BaseEmailList } from '@/components/email/base-email-list';
import { useEmailInbox } from '@/lib/hooks/use-email-client';

export default function EmailInbox() {
  const { data: emails, isLoading, refetch, isRefetching, error } = useEmailInbox();

  return (
    <BaseEmailList
      title="Odebrane"
      emails={emails}
      isLoading={isLoading}
      isRefetching={isRefetching}
      refetch={refetch}
      emptyMessage="Brak wiadomości w skrzynce odbiorczej"
      error={error}
    />
  );
}
