import { HttpException, HttpStatus } from '@nestjs/common';
import {
  EmailClientErrorCode,
  EmailClientErrorMessages,
} from './error-codes.enum';

/**
 * Base exception for Email Client module errors
 */
export class EmailClientException extends HttpException {
  constructor(
    public readonly errorCode: EmailClientErrorCode,
    public readonly details?: Record<string, unknown>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    const message = EmailClientErrorMessages[errorCode];
    super(
      {
        statusCode,
        error: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}

/**
 * Exception for email configuration errors
 */
export class EmailConfigException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.EMAIL_CONFIG_MISSING
      | EmailClientErrorCode.EMAIL_CONFIG_INVALID
      | EmailClientErrorCode.CREDENTIALS_INVALID,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.EMAIL_CONFIG_MISSING
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for IMAP connection errors
 */
export class ImapConnectionException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.IMAP_CONNECTION_FAILED
      | EmailClientErrorCode.IMAP_AUTHENTICATION_FAILED
      | EmailClientErrorCode.IMAP_TIMEOUT
      | EmailClientErrorCode.IMAP_SSL_ERROR
      | EmailClientErrorCode.IMAP_DISCONNECTED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.IMAP_TIMEOUT
        ? HttpStatus.GATEWAY_TIMEOUT
        : errorCode === EmailClientErrorCode.IMAP_AUTHENTICATION_FAILED
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_GATEWAY;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for SMTP errors
 */
export class SmtpException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.SMTP_CONNECTION_FAILED
      | EmailClientErrorCode.SMTP_AUTHENTICATION_FAILED
      | EmailClientErrorCode.SMTP_SEND_FAILED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.SMTP_AUTHENTICATION_FAILED
        ? HttpStatus.UNAUTHORIZED
        : HttpStatus.BAD_GATEWAY;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for draft-related errors
 */
export class EmailDraftException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.DRAFT_NOT_FOUND
      | EmailClientErrorCode.DRAFT_ACCESS_DENIED
      | EmailClientErrorCode.DRAFT_SAVE_FAILED
      | EmailClientErrorCode.DRAFT_SYNC_FAILED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.DRAFT_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : errorCode === EmailClientErrorCode.DRAFT_ACCESS_DENIED
          ? HttpStatus.FORBIDDEN
          : HttpStatus.INTERNAL_SERVER_ERROR;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for message-related errors
 */
export class EmailMessageException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.MESSAGE_NOT_FOUND
      | EmailClientErrorCode.MESSAGE_FETCH_FAILED
      | EmailClientErrorCode.MESSAGE_DELETE_FAILED
      | EmailClientErrorCode.MESSAGE_MOVE_FAILED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.MESSAGE_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for attachment errors
 */
export class EmailAttachmentException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.ATTACHMENT_TOO_LARGE
      | EmailClientErrorCode.ATTACHMENT_NOT_FOUND
      | EmailClientErrorCode.ATTACHMENT_UPLOAD_FAILED
      | EmailClientErrorCode.ATTACHMENT_TYPE_NOT_ALLOWED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.ATTACHMENT_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : errorCode === EmailClientErrorCode.ATTACHMENT_TOO_LARGE
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : errorCode === EmailClientErrorCode.ATTACHMENT_UPLOAD_FAILED
            ? HttpStatus.INTERNAL_SERVER_ERROR
            : HttpStatus.BAD_REQUEST;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for AI integration errors
 */
export class EmailAIException extends EmailClientException {
  constructor(
    errorCode:
      | EmailClientErrorCode.AI_NOT_CONFIGURED
      | EmailClientErrorCode.AI_COMPOSE_FAILED
      | EmailClientErrorCode.AI_REPLY_FAILED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === EmailClientErrorCode.AI_NOT_CONFIGURED
        ? HttpStatus.PRECONDITION_FAILED
        : HttpStatus.INTERNAL_SERVER_ERROR;
    super(errorCode, details, statusCode);
  }
}
