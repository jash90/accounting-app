import { HttpStatus } from '@nestjs/common';
import { ClientException } from './client.exception';
import { ClientErrorCode } from './error-codes.enum';

/**
 * Exception thrown when delete request is not found
 */
export class DeleteRequestNotFoundException extends ClientException {
  constructor(requestId: string, context?: Record<string, any>) {
    super(
      ClientErrorCode.DELETE_REQUEST_NOT_FOUND,
      `Delete request with ID ${requestId} not found`,
      {
        ...context,
        additionalInfo: {
          requestId,
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception thrown when delete request has already been processed
 */
export class DeleteRequestAlreadyProcessedException extends ClientException {
  constructor(requestId: string, status: string) {
    super(
      ClientErrorCode.DELETE_REQUEST_ALREADY_PROCESSED,
      `Delete request ${requestId} has already been processed with status: ${status}`,
      {
        additionalInfo: {
          requestId,
          currentStatus: status,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exception thrown when delete request processing fails
 */
export class DeleteRequestFailedException extends ClientException {
  constructor(requestId: string, reason: string, context?: Record<string, any>) {
    super(
      ClientErrorCode.DELETE_REQUEST_FAILED,
      `Failed to process delete request: ${reason}`,
      {
        ...context,
        additionalInfo: {
          requestId,
          reason,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
