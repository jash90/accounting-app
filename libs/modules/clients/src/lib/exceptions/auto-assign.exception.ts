import { HttpStatus } from '@nestjs/common';
import { ClientException } from './client.exception';
import { ClientErrorCode } from './error-codes.enum';

/**
 * Exception thrown when auto-assign condition evaluation fails
 */
export class AutoAssignEvaluationException extends ClientException {
  constructor(
    conditionId: string,
    reason: string,
    context?: Record<string, any>,
  ) {
    super(
      ClientErrorCode.AUTO_ASSIGN_EVALUATION_FAILED,
      `Auto-assign condition evaluation failed: ${reason}`,
      {
        ...context,
        additionalInfo: {
          conditionId,
          reason,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Exception thrown when auto-assign condition is invalid
 */
export class InvalidConditionException extends ClientException {
  constructor(conditionData: any, reason: string) {
    super(
      ClientErrorCode.AUTO_ASSIGN_CONDITION_INVALID,
      `Invalid auto-assign condition: ${reason}`,
      {
        additionalInfo: {
          conditionData,
          reason,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Exception thrown when batch auto-assign operation fails for some clients
 */
export class BatchAssignException extends ClientException {
  constructor(failedAssignments: Array<{ clientId: string; error: string }>) {
    super(
      ClientErrorCode.AUTO_ASSIGN_BATCH_FAILED,
      `Batch auto-assign failed for ${failedAssignments.length} clients`,
      {
        additionalInfo: {
          failedCount: failedAssignments.length,
          failures: failedAssignments,
        },
      },
      HttpStatus.MULTI_STATUS,
    );
  }
}
