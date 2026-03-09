import { HttpStatus } from '@nestjs/common';

import { ClientException, type ClientExceptionContext } from './client.exception';
import { ClientErrorCode } from './error-codes.enum';

export class IconNotFoundException extends ClientException {
  constructor(iconId: string, companyId?: string) {
    super(
      ClientErrorCode.ICON_NOT_FOUND,
      `Icon with ID ${iconId} not found`,
      { additionalInfo: { iconId }, companyId },
      HttpStatus.NOT_FOUND
    );
  }
}

export class IconUploadException extends ClientException {
  constructor(fileName: string, reason: string, context?: ClientExceptionContext) {
    super(
      ClientErrorCode.ICON_UPLOAD_FAILED,
      `Failed to upload icon file "${fileName}": ${reason}`,
      { ...context, additionalInfo: { fileName, reason } },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class IconAssignmentException extends ClientException {
  constructor(
    clientId: string,
    iconCount: number,
    reason: string,
    context?: ClientExceptionContext
  ) {
    super(
      ClientErrorCode.ICON_ASSIGNMENT_FAILED,
      `Failed to assign ${iconCount} icon(s) to client: ${reason}`,
      { ...context, clientId, additionalInfo: { iconCount, reason } },
      HttpStatus.BAD_REQUEST
    );
  }
}
