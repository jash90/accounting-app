import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
} from '@accounting/common';

/**
 * Response DTO for client data
 */
export class ClientResponseDto {
  @ApiProperty({
    description: 'Unique client identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Client name',
    example: 'ACME Corporation',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'NIP (Tax Identification Number)',
    example: '1234567890',
  })
  nip?: string;

  @ApiPropertyOptional({
    description: 'Client email address',
    example: 'contact@acme.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Client phone number',
    example: '+48 123 456 789',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company start date',
    example: '2020-01-15',
  })
  companyStartDate?: Date;

  @ApiPropertyOptional({
    description: 'Cooperation start date',
    example: '2021-06-01',
  })
  cooperationStartDate?: Date;

  @ApiPropertyOptional({
    description: 'Suspension date (if suspended)',
    example: null,
  })
  suspensionDate?: Date;

  @ApiPropertyOptional({
    description: 'Company specificity notes',
    example: 'E-commerce business with international sales',
  })
  companySpecificity?: string;

  @ApiPropertyOptional({
    description: 'Additional information about the client',
    example: 'Requires monthly reporting',
  })
  additionalInfo?: string;

  @ApiPropertyOptional({
    description: 'GTU code for tax purposes',
    example: 'GTU_01',
  })
  gtuCode?: string;

  @ApiPropertyOptional({
    description: 'AML (Anti-Money Laundering) risk group',
    example: 'LOW',
  })
  amlGroup?: string;

  @ApiPropertyOptional({
    enum: EmploymentType,
    description: 'Employment type',
    example: EmploymentType.DG,
  })
  employmentType?: EmploymentType;

  @ApiPropertyOptional({
    enum: VatStatus,
    description: 'VAT registration status',
    example: VatStatus.VAT_MONTHLY,
  })
  vatStatus?: VatStatus;

  @ApiPropertyOptional({
    enum: TaxScheme,
    description: 'Tax scheme',
    example: TaxScheme.GENERAL,
  })
  taxScheme?: TaxScheme;

  @ApiPropertyOptional({
    enum: ZusStatus,
    description: 'ZUS (Social Insurance) status',
    example: ZusStatus.FULL,
  })
  zusStatus?: ZusStatus;

  @ApiPropertyOptional({
    description: 'Whether client should receive email copies of documents',
    example: true,
  })
  receiveEmailCopy?: boolean;

  @ApiProperty({
    description: 'Whether the client is active (not soft-deleted)',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Company ID that owns this client',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId!: string;

  @ApiProperty({
    description: 'Client creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-06-20T14:45:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Paginated response for client list
 */
export class PaginatedClientsResponseDto {
  @ApiProperty({
    type: [ClientResponseDto],
    description: 'Array of clients',
  })
  data!: ClientResponseDto[];

  @ApiProperty({
    description: 'Total number of clients matching the filter',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages!: number;
}

/**
 * Response DTO for changelog entry
 */
export class ChangelogEntryResponseDto {
  @ApiProperty({
    description: 'Changelog entry ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  id!: string;

  @ApiProperty({
    description: 'Entity type that was changed',
    example: 'Client',
  })
  entityType!: string;

  @ApiProperty({
    description: 'ID of the changed entity',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  entityId!: string;

  @ApiProperty({
    description: 'Type of change',
    enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
    example: 'UPDATE',
  })
  changeType!: string;

  @ApiPropertyOptional({
    description: 'Field that was changed (for UPDATE)',
    example: 'email',
  })
  fieldName?: string;

  @ApiPropertyOptional({
    description: 'Previous value before change',
    example: 'old@email.com',
  })
  oldValue?: string;

  @ApiPropertyOptional({
    description: 'New value after change',
    example: 'new@email.com',
  })
  newValue?: string;

  @ApiProperty({
    description: 'ID of user who made the change',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  changedBy!: string;

  @ApiProperty({
    description: 'Timestamp when the change was made',
    example: '2024-06-20T14:45:00.000Z',
  })
  changedAt!: Date;
}

/**
 * Response for paginated changelog
 */
export class PaginatedChangelogResponseDto {
  @ApiProperty({
    type: [ChangelogEntryResponseDto],
    description: 'Array of changelog entries',
  })
  data!: ChangelogEntryResponseDto[];

  @ApiProperty({
    description: 'Total number of changelog entries',
    example: 500,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit!: number;
}

/**
 * Response for delete request
 */
export class DeleteRequestResponseDto {
  @ApiProperty({
    description: 'Delete request ID',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  id!: string;

  @ApiProperty({
    description: 'Client ID to be deleted',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  clientId!: string;

  @ApiProperty({
    description: 'Reason for deletion',
    example: 'Client has terminated cooperation',
  })
  reason!: string;

  @ApiProperty({
    description: 'Request status',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    description: 'User who requested deletion',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  requestedBy!: string;

  @ApiProperty({
    description: 'When the request was created',
    example: '2024-06-20T14:45:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Response for custom field value
 */
export class CustomFieldValueResponseDto {
  @ApiProperty({
    description: 'Custom field value ID',
    example: '550e8400-e29b-41d4-a716-446655440005',
  })
  id!: string;

  @ApiProperty({
    description: 'Field definition ID',
    example: '550e8400-e29b-41d4-a716-446655440006',
  })
  fieldDefinitionId!: string;

  @ApiProperty({
    description: 'Field name',
    example: 'Contract Number',
  })
  fieldName!: string;

  @ApiPropertyOptional({
    description: 'Field value',
    example: 'CNT-2024-001',
  })
  value?: string;
}

/**
 * Generic success message response
 */
export class SuccessMessageResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
  })
  message!: string;
}

/**
 * Error response DTO
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Error type',
    example: 'Bad Request',
  })
  error?: string;
}
