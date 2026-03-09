import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Composed decorator that adds the standard Swagger response annotation
 * for CSV file download endpoints.
 */
export function ApiCsvResponse(description = 'CSV file download') {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      content: {
        'text/csv': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    })
  );
}
