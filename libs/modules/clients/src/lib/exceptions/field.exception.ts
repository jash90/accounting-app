import { HttpStatus } from '@nestjs/common';
import { ClientException } from './client.exception';
import { ClientErrorCode } from './error-codes.enum';

export class FieldNotFoundException extends ClientException {
  constructor(fieldId: string, companyId?: string) {
    super(
      ClientErrorCode.FIELD_NOT_FOUND,
      `Field definition with ID ${fieldId} not found`,
      { additionalInfo: { fieldDefinitionId: fieldId }, companyId },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class FieldValidationException extends ClientException {
  constructor(
    fieldLabel: string,
    fieldType: string,
    providedValue: unknown,
    reason: string,
  ) {
    super(
      ClientErrorCode.FIELD_VALIDATION_FAILED,
      `Validation failed for field "${fieldLabel}": ${reason}`,
      {
        additionalInfo: {
          fieldLabel,
          fieldType,
          providedValue,
          validationError: reason,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FieldRequiredException extends ClientException {
  constructor(fieldLabel: string, fieldId: string) {
    super(
      ClientErrorCode.FIELD_REQUIRED,
      `Field "${fieldLabel}" is required`,
      { additionalInfo: { fieldDefinitionId: fieldId, fieldLabel } },
      HttpStatus.BAD_REQUEST,
    );
  }
}
