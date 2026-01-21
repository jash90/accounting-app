import { BaseEmailList } from '@/components/email/base-email-list';
import { useInbox } from '@/lib/hooks/use-email-client';

export default function EmailInbox() {
  const { data: emails, isLoading, refetch, isRefetching } = useInbox();

  return (
    <BaseEmailList
      title="Odebrane"
      emails={emails}
      isLoading={isLoading}
      isRefetching={isRefetching}
      refetch={refetch}
      emptyMessage="Brak wiadomości w skrzynce odbiorczej"
    />
  );
}
