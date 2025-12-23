import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ClientException, ClientErrorCode } from '@accounting/modules/clients';
import { Request, Response } from 'express';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request
    mockRequest = {
      url: '/test/endpoint',
      method: 'POST',
      headers: {},
    };

    // Mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ArgumentsHost;

    // Spy on logger methods
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ClientException Handling', () => {
    it('should handle ClientException with all properties', () => {
      const exception = new ClientException(
        ClientErrorCode.CLIENT_NOT_FOUND,
        'Client not found',
        { clientId: '123' },
        HttpStatus.NOT_FOUND
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Client not found',
          errorCode: ClientErrorCode.CLIENT_NOT_FOUND,
          context: { clientId: '123' },
          timestamp: expect.any(String),
          path: '/test/endpoint',
          method: 'POST',
          requestId: expect.any(String),
        })
      );
    });

    it('should log ClientException at warn level', () => {
      const exception = new ClientException(
        ClientErrorCode.CLIENT_NOT_FOUND,
        'Test error',
        undefined,
        HttpStatus.NOT_FOUND
      );

      filter.catch(exception, mockHost);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ClientException'),
        expect.objectContaining({
          requestId: expect.any(String),
          path: '/test/endpoint',
          method: 'POST',
        })
      );
    });

    it('should extract user context from request when available', () => {
      mockRequest = {
        ...mockRequest,
        user: {
          id: 'user-123',
          companyId: 'company-456',
        },
      } as any;

      const exception = new ClientException(
        ClientErrorCode.CLIENT_NOT_FOUND,
        'Test error',
        undefined,
        HttpStatus.NOT_FOUND
      );

      filter.catch(exception, mockHost);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: 'user-123',
          companyId: 'company-456',
        })
      );
    });
  });

  describe('HttpException Handling', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden',
          errorCode: ClientErrorCode.PERMISSION_DENIED,
        })
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom error message' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
          errorCode: ClientErrorCode.VALIDATION_ERROR,
        })
      );
    });

    it('should handle validation errors with array of messages', () => {
      const validationMessages = ['Field is required', 'Invalid format'];
      const exception = new HttpException(
        { message: validationMessages },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: ClientErrorCode.VALIDATION_ERROR,
          context: {
            validationErrors: validationMessages,
          },
        })
      );
    });

    it('should log HttpException at warn level', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('HttpException'),
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
        })
      );
    });

    describe('HTTP Status to Error Code Mapping', () => {
      const testCases = [
        { status: HttpStatus.UNAUTHORIZED, expected: ClientErrorCode.UNAUTHORIZED },
        { status: HttpStatus.FORBIDDEN, expected: ClientErrorCode.PERMISSION_DENIED },
        { status: HttpStatus.BAD_REQUEST, expected: ClientErrorCode.VALIDATION_ERROR },
        { status: HttpStatus.NOT_FOUND, expected: ClientErrorCode.UNKNOWN_ERROR },
        { status: HttpStatus.CONFLICT, expected: ClientErrorCode.UNKNOWN_ERROR },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, expected: ClientErrorCode.INTERNAL_ERROR },
        { status: 418, expected: ClientErrorCode.UNKNOWN_ERROR }, // I'm a teapot - unmapped status
      ];

      testCases.forEach(({ status, expected }) => {
        it(`should map ${status} to ${expected}`, () => {
          const exception = new HttpException('Test', status);

          filter.catch(exception, mockHost);

          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              errorCode: expected,
            })
          );
        });
      });
    });
  });

  describe('Unexpected Error Handling', () => {
    it('should handle unexpected Error instances', () => {
      const error = new Error('Unexpected database error');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred',
          errorCode: ClientErrorCode.UNKNOWN_ERROR,
        })
      );
    });

    it('should sanitize error messages for security', () => {
      const error = new Error('Database connection string: postgres://admin:password@localhost');

      filter.catch(error, mockHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe('An unexpected error occurred');
      expect(responseCall.message).not.toContain('password');
    });

    it('should log unexpected errors at error level with full details', () => {
      const error = new Error('Test unexpected error');
      error.stack = 'Error: Test\n    at TestModule.test (test.ts:10:5)';

      filter.catch(error, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        expect.objectContaining({
          errorName: 'Error',
          errorMessage: 'Test unexpected error',
          stack: expect.stringContaining('Error: Test'),
        })
      );
    });

    it('should handle non-Error objects', () => {
      const stringError = 'Something went wrong';

      filter.catch(stringError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
          errorCode: ClientErrorCode.UNKNOWN_ERROR,
        })
      );
    });

    it('should handle null/undefined exceptions', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(undefined, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Request Correlation ID', () => {
    it('should use x-request-id header when provided', () => {
      mockRequest.headers = {
        'x-request-id': 'test-correlation-id-123',
      };

      const exception = new Error('Test');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-correlation-id-123',
        })
      );
    });

    it('should generate UUID when x-request-id header is missing', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should use same request ID in logs and response', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const logCall = loggerErrorSpy.mock.calls[0][1];

      expect(responseCall.requestId).toBe(logCall.requestId);
    });
  });

  describe('Response Structure', () => {
    it('should always include required fields', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          message: expect.any(String),
          errorCode: expect.any(String),
          timestamp: expect.any(String),
          path: expect.any(String),
          method: expect.any(String),
          requestId: expect.any(String),
        })
      );
    });

    it('should format timestamp as ISO string', () => {
      const exception = new Error('Test');

      filter.catch(exception, mockHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = new Date(responseCall.timestamp);

      expect(timestamp.toISOString()).toBe(responseCall.timestamp);
    });

    it('should include context only when present', () => {
      const exceptionWithContext = new ClientException(
        ClientErrorCode.CLIENT_NOT_FOUND,
        'Test',
        { additionalInfo: { field: 'value' } },
        HttpStatus.NOT_FOUND
      );

      filter.catch(exceptionWithContext, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { additionalInfo: { field: 'value' } },
        })
      );

      jest.clearAllMocks();

      const exceptionWithoutContext = new Error('Test');

      filter.catch(exceptionWithoutContext, mockHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.context).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive exceptions', () => {
      const exceptions = [
        new ClientException(ClientErrorCode.CLIENT_NOT_FOUND, 'Error 1', undefined, HttpStatus.NOT_FOUND),
        new HttpException('Error 2', HttpStatus.BAD_REQUEST),
        new Error('Error 3'),
      ];

      exceptions.forEach((exception) => {
        filter.catch(exception, mockHost);
      });

      expect(mockResponse.status).toHaveBeenCalledTimes(3);
      expect(mockResponse.json).toHaveBeenCalledTimes(3);
    });

    it('should maintain thread safety with concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          const mockHostInstance = {
            switchToHttp: jest.fn().mockReturnValue({
              getResponse: () => ({
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
              }),
              getRequest: () => ({
                url: `/test/${i}`,
                method: 'GET',
                headers: {},
              }),
            }),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
          } as ArgumentsHost;

          filter.catch(new Error(`Error ${i}`), mockHostInstance);
        })
      );

      await Promise.all(promises);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(10);
    });
  });
});
