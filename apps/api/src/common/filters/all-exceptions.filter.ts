import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClientException } from '@accounting/modules/clients';
import { ClientErrorCode } from '@accounting/modules/clients';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global exception filter that catches all exceptions and normalizes error responses.
 *
 * Handles three error categories:
 * 1. ClientException (custom) - Pass through with normalization
 * 2. HttpException (NestJS) - Map to error codes and normalize
 * 3. Unexpected errors - Sanitize and log for security
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate or extract request correlation ID for distributed tracing
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    // Build base error response with safe defaults
    const errorResponse: ErrorResponseDto = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorCode: ClientErrorCode.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId,
    };

    // Handle different exception types with specific logic
    if (exception instanceof ClientException) {
      // Custom exceptions - pass through with normalization
      this.handleClientException(exception, errorResponse, request, requestId);
    } else if (exception instanceof HttpException) {
      // NestJS built-in exceptions - map to error codes
      this.handleHttpException(exception, errorResponse, request, requestId);
    } else {
      // Unexpected errors - sanitize and log
      this.handleUnexpectedError(exception, errorResponse, request, requestId);
    }

    // Send normalized error response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Handle custom ClientException instances
   * These already have proper structure, just normalize and log
   */
  private handleClientException(
    exception: ClientException,
    errorResponse: ErrorResponseDto,
    request: Request,
    requestId: string,
  ): void {
    errorResponse.statusCode = exception.getStatus();
    errorResponse.message = exception.message;
    errorResponse.errorCode = exception.errorCode;
    errorResponse.context = exception.context;

    // Log custom exceptions at warn level (business logic errors)
    this.logger.warn(
      `ClientException: ${exception.errorCode} - ${exception.message}`,
      {
        requestId,
        path: request.url,
        method: request.method,
        userId: (request as any).user?.id,
        companyId: (request as any).user?.companyId,
        context: exception.context,
      },
    );
  }

  /**
   * Handle NestJS HttpException instances
   * Map status codes to error codes and extract messages
   */
  private handleHttpException(
    exception: HttpException,
    errorResponse: ErrorResponseDto,
    request: Request,
    requestId: string,
  ): void {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    errorResponse.statusCode = status;

    // Extract message from different response formats
    if (typeof exceptionResponse === 'string') {
      errorResponse.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;
      errorResponse.message = responseObj.message || exception.message;

      // Handle validation errors specially
      if (Array.isArray(responseObj.message)) {
        errorResponse.errorCode = ClientErrorCode.VALIDATION_ERROR;
        errorResponse.context = {
          validationErrors: responseObj.message,
        };
      }
    } else {
      errorResponse.message = exception.message;
    }

    // Map HTTP status to error code if not already set
    if (!errorResponse.errorCode || errorResponse.errorCode === ClientErrorCode.INTERNAL_ERROR) {
      errorResponse.errorCode = this.mapStatusToErrorCode(status);
    }

    // Log HTTP exceptions at warn level
    this.logger.warn(`HttpException: ${status} - ${errorResponse.message}`, {
      requestId,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      statusCode: status,
    });
  }

  /**
   * Handle unexpected errors (not HttpException or ClientException)
   * Sanitize error details to prevent information leakage
   */
  private handleUnexpectedError(
    exception: unknown,
    errorResponse: ErrorResponseDto,
    request: Request,
    requestId: string,
  ): void {
    const error = exception as Error;

    // Use safe, generic message for clients
    errorResponse.message = 'An unexpected error occurred';
    errorResponse.errorCode = ClientErrorCode.UNKNOWN_ERROR;

    // Log unexpected errors at error level with full details for debugging
    this.logger.error(
      `Unexpected error: ${error?.message || 'Unknown error'}`,
      {
        requestId,
        path: request.url,
        method: request.method,
        userId: (request as any).user?.id,
        companyId: (request as any).user?.companyId,
        errorName: error?.name,
        errorMessage: error?.message,
        stack: error?.stack,
        error: error?.toString(),
      },
    );
  }

  /**
   * Map HTTP status codes to appropriate error codes
   * Provides consistent error codes for common HTTP errors
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ClientErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ClientErrorCode.PERMISSION_DENIED;
      case HttpStatus.BAD_REQUEST:
        return ClientErrorCode.VALIDATION_ERROR;
      case HttpStatus.NOT_FOUND:
        // Generic not found - specific entities use their own codes
        return ClientErrorCode.UNKNOWN_ERROR;
      case HttpStatus.CONFLICT:
        // Conflict errors - specific cases use their own codes
        return ClientErrorCode.UNKNOWN_ERROR;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ClientErrorCode.INTERNAL_ERROR;
      default:
        return ClientErrorCode.UNKNOWN_ERROR;
    }
  }
}
