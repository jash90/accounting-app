import { SetMetadata } from '@nestjs/common';

import { type NotificationType } from '@accounting/common';

export const NOTIFY_ON_KEY = 'notifyOn';

export type RecipientResolver =
  | 'actor'
  | 'assignee'
  | 'companyUsers'
  | 'companyUsersExceptActor'
  | ((result: unknown, actor: { id: string; companyId: string }) => string[] | Promise<string[]>);

export interface NotifyOnOptions {
  type: NotificationType;
  titleTemplate: string;
  messageTemplate?: string;
  recipientResolver: RecipientResolver;
  actionUrlTemplate?: string;
  condition?: (result: unknown) => boolean;
  dataExtractor?: (result: unknown) => Record<string, unknown>;
}

export interface NotifyBatchOptions extends Omit<NotifyOnOptions, 'dataExtractor'> {
  itemsExtractor: (result: unknown) => Array<{
    id: string;
    title: string;
    actionUrl?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
  }>;
}

export const NotifyOn = (options: NotifyOnOptions) =>
  SetMetadata(NOTIFY_ON_KEY, { ...options, isBatch: false });

export const NotifyBatch = (options: NotifyBatchOptions) =>
  SetMetadata(NOTIFY_ON_KEY, { ...options, isBatch: true });
