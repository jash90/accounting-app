import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Observable, tap } from 'rxjs';

import { User } from '@accounting/common';

import {
  NOTIFY_ON_KEY,
  NotifyBatchOptions,
  NotifyOnOptions,
} from '../decorators/notify-on.decorator';
import { NotificationEventPayload } from '../dto/notification-event-payload.dto';

@Injectable()
export class NotificationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NotificationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<
      (NotifyOnOptions | NotifyBatchOptions) & { isBatch: boolean }
    >(NOTIFY_ON_KEY, context.getHandler());

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const actor = request.user as User;

    if (!actor) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (result) => {
          if (metadata.condition && !metadata.condition(result)) {
            return;
          }

          this.eventEmitter.emit('notification.dispatch', {
            options: metadata,
            result,
            actor,
            isBatch: metadata.isBatch,
          } as NotificationEventPayload);
        },
        error: () => {},
      })
    );
  }
}
