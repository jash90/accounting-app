import { type User } from '@accounting/common';

import { type NotifyBatchOptions, type NotifyOnOptions } from '../decorators/notify-on.decorator';

/**
 * Payload structure for notification dispatch events.
 * Used by both NotificationInterceptor and NotificationListener
 * to ensure consistent event handling.
 */
export interface NotificationEventPayload {
  options: NotifyOnOptions | NotifyBatchOptions;
  result: unknown;
  actor: User;
  isBatch: boolean;
}
