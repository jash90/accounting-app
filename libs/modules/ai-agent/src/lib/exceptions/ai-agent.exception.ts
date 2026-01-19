import { HttpException, HttpStatus } from '@nestjs/common';
import { AIAgentErrorCode, AIAgentErrorMessages } from './error-codes.enum';

/**
 * Base exception for AI Agent module errors
 */
export class AIAgentException extends HttpException {
  constructor(
    public readonly errorCode: AIAgentErrorCode,
    public readonly details?: Record<string, unknown>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    const message = AIAgentErrorMessages[errorCode];
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
 * Exception for configuration-related errors
 */
export class AIConfigurationException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.CONFIGURATION_NOT_FOUND
      | AIAgentErrorCode.CONFIGURATION_INVALID
      | AIAgentErrorCode.CONFIGURATION_ALREADY_EXISTS,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === AIAgentErrorCode.CONFIGURATION_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : errorCode === AIAgentErrorCode.CONFIGURATION_ALREADY_EXISTS
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for API key-related errors
 */
export class AIApiKeyException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.API_KEY_MISSING
      | AIAgentErrorCode.API_KEY_INVALID
      | AIAgentErrorCode.API_KEY_EXPIRED,
    details?: Record<string, unknown>
  ) {
    super(errorCode, details, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Exception for AI provider errors
 */
export class AIProviderException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.PROVIDER_ERROR
      | AIAgentErrorCode.PROVIDER_UNAVAILABLE
      | AIAgentErrorCode.PROVIDER_RATE_LIMITED
      | AIAgentErrorCode.PROVIDER_MODEL_NOT_FOUND,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === AIAgentErrorCode.PROVIDER_RATE_LIMITED
        ? HttpStatus.TOO_MANY_REQUESTS
        : errorCode === AIAgentErrorCode.PROVIDER_UNAVAILABLE
          ? HttpStatus.SERVICE_UNAVAILABLE
          : errorCode === AIAgentErrorCode.PROVIDER_MODEL_NOT_FOUND
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_GATEWAY;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for conversation-related errors
 */
export class AIConversationException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.CONVERSATION_NOT_FOUND
      | AIAgentErrorCode.CONVERSATION_ACCESS_DENIED
      | AIAgentErrorCode.MESSAGE_SEND_FAILED,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === AIAgentErrorCode.CONVERSATION_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : errorCode === AIAgentErrorCode.CONVERSATION_ACCESS_DENIED
          ? HttpStatus.FORBIDDEN
          : HttpStatus.INTERNAL_SERVER_ERROR;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for token limit errors
 */
export class AITokenLimitException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.TOKEN_LIMIT_EXCEEDED
      | AIAgentErrorCode.TOKEN_LIMIT_NOT_SET
      | AIAgentErrorCode.TOKEN_USAGE_ERROR,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === AIAgentErrorCode.TOKEN_LIMIT_EXCEEDED
        ? HttpStatus.PAYMENT_REQUIRED
        : HttpStatus.BAD_REQUEST;
    super(errorCode, details, statusCode);
  }
}

/**
 * Exception for RAG/context errors
 */
export class AIContextException extends AIAgentException {
  constructor(
    errorCode:
      | AIAgentErrorCode.CONTEXT_UPLOAD_FAILED
      | AIAgentErrorCode.CONTEXT_NOT_FOUND
      | AIAgentErrorCode.CONTEXT_PROCESSING_ERROR
      | AIAgentErrorCode.CONTEXT_TOO_LARGE,
    details?: Record<string, unknown>
  ) {
    const statusCode =
      errorCode === AIAgentErrorCode.CONTEXT_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : errorCode === AIAgentErrorCode.CONTEXT_TOO_LARGE
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.BAD_REQUEST;
    super(errorCode, details, statusCode);
  }
}
