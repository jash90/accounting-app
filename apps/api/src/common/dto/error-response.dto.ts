import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response format for all API errors
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
    type: Number,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Client with ID abc-123 not found',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Machine-readable error code for programmatic error handling',
    example: 'CLIENT_001',
    enum: [
      // Client errors
      'CLIENT_001',
      'CLIENT_002',
      'CLIENT_003',
      'CLIENT_004',
      'CLIENT_005',
      // Icon errors
      'ICON_001',
      'ICON_002',
      'ICON_003',
      'ICON_004',
      'ICON_005',
      // Field errors
      'FIELD_001',
      'FIELD_002',
      'FIELD_003',
      'FIELD_004',
      'FIELD_005',
      // Auto-assign errors
      'ASSIGN_001',
      'ASSIGN_002',
      'ASSIGN_003',
      // Delete request errors
      'DELETE_001',
      'DELETE_002',
      'DELETE_003',
      // Authorization errors
      'PERMISSION_DENIED',
      'UNAUTHORIZED',
      'FORBIDDEN',
      // System errors
      'INTERNAL_ERROR',
      'UNKNOWN_ERROR',
      'VALIDATION_ERROR',
    ],
  })
  errorCode: string;

  @ApiProperty({
    description: 'Additional error context and metadata',
    example: { clientId: 'abc-123', companyId: 'xyz-456' },
    required: false,
  })
  context?: Record<string, any>;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the error occurred',
    example: '2025-12-23T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/clients/abc-123',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used in the request',
    example: 'GET',
    type: String,
  })
  method: string;

  @ApiProperty({
    description: 'Request correlation ID for distributed tracing',
    example: 'req-abc-123-xyz',
    type: String,
  })
  requestId: string;
}
