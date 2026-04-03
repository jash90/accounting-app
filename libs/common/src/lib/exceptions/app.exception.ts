import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Context attached to structured exceptions for debugging/logging.
 */
export interface AppExceptionContext {
  [key: string]: unknown;
}

/**
 * Base structured exception for the entire application.
 * All module-specific exceptions (ClientException, etc.) should extend this.
 *
 * Provides:
 * - errorCode: machine-readable code for programmatic handling
 * - context: structured metadata for debugging (sanitized before sending to client)
 * - timestamp: ISO string for correlation
 */
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    public readonly context?: AppExceptionContext,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        context,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}
