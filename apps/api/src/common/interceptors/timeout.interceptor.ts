import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/** Metadata key for per-route timeout overrides */
export const TIMEOUT_KEY = 'request_timeout';

/**
 * Decorator to override the default request timeout on specific routes.
 * @param ms Timeout in milliseconds
 *
 * @example
 * ```typescript
 * @SetTimeout(180_000) // 3 minutes for AI endpoints
 * @Post('chat')
 * async chat() { ... }
 * ```
 */
export const SetTimeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);

/** Default request timeout: 30 seconds */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Global interceptor that enforces a request timeout.
 * Prevents requests from hanging indefinitely (e.g., slow DB queries, external API calls).
 *
 * Routes can override the default timeout using @SetTimeout(ms) decorator.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const timeoutMs =
      this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Przekroczono limit czasu żądania'));
        }
        return throwError(() => err);
      })
    );
  }
}
