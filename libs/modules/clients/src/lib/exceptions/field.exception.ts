import { HttpStatus } from '@nestjs/common';

import { ClientException } from './client.exception';
import { ClientErrorCode } from './error-codes.enum';

export class FieldNotFoundException extends ClientException {
  constructor(fieldId: string, companyId?: string) {
    super(
      ClientErrorCode.FIELD_NOT_FOUND,
      `Field definition with ID ${fieldId} not found`,
      { additionalInfo: { fieldDefinitionId: fieldId }, companyId },
      HttpStatus.NOT_FOUND
    );
  }
}

/**
 * Sanitize a value for safe inclusion in error responses
 * Masks sensitive patterns and truncates long values
 */
function sanitizeValueForError(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Truncate long strings
    const maxLength = 100;
    let sanitized = value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
    // Mask potential sensitive patterns (credit card-like, tokens)
    sanitized = sanitized.replace(/\b\d{13,19}\b/g, '[MASKED]');
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[MASKED]');
    return sanitized;
  }

  if (typeof value === 'object') {
    // For objects, only return type and keys to avoid leaking data
    const keys = Object.keys(value as object);
    return { type: Array.isArray(value) ? 'array' : 'object', keys: keys.slice(0, 5) };
  }

  return value;
}

export class FieldValidationException extends ClientException {
  constructor(fieldLabel: string, fieldType: string, providedValue: unknown, reason: string) {
    super(
      ClientErrorCode.FIELD_VALIDATION_FAILED,
      `Validation failed for field "${fieldLabel}": ${reason}`,
      {
        additionalInfo: {
          fieldLabel,
          fieldType,
          providedValue: sanitizeValueForError(providedValue),
          validationError: reason,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class FieldRequiredException extends ClientException {
  constructor(fieldLabel: string, fieldId: string) {
    super(
      ClientErrorCode.FIELD_REQUIRED,
      `Field "${fieldLabel}" is required`,
      { additionalInfo: { fieldDefinitionId: fieldId, fieldLabel } },
      HttpStatus.BAD_REQUEST
    );
  }
}
