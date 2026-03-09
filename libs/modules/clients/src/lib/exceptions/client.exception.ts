import { HttpException, HttpStatus } from '@nestjs/common';

import { ClientErrorCode } from './error-codes.enum';

export interface ClientExceptionContext {
  clientId?: string;
  companyId?: string;
  userId?: string;
  operationStage?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Base exception class for all client module errors
 * Provides structured error responses with error codes and context
 */
export class ClientException extends HttpException {
  constructor(
    public readonly errorCode: ClientErrorCode,
    message: string,
    public readonly context?: ClientExceptionContext,
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

/**
 * Client not found exception
 * Use when client doesn't exist or belongs to different company
 */
export class ClientNotFoundException extends ClientException {
  constructor(clientId: string, companyId?: string) {
    super(
      ClientErrorCode.CLIENT_NOT_FOUND,
      `Client with ID ${clientId} not found`,
      { clientId, companyId },
      HttpStatus.NOT_FOUND
    );
  }
}

/**
 * Batch operation exception with detailed failure info
 * Use when some items in batch fail
 */
export class ClientBatchOperationException extends ClientException {
  constructor(failedItems: Array<{ id: string; error: string }>, context?: ClientExceptionContext) {
    super(
      ClientErrorCode.CLIENT_BATCH_OPERATION_FAILED,
      `Batch operation failed for ${failedItems.length} item(s)`,
      { ...context, additionalInfo: { failedItems } },
      HttpStatus.MULTI_STATUS
    );
  }
}
