import {
  IsArray,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  PKD_CODE_REGEX,
  PKD_CODE_VALIDATION_MESSAGE,
} from '@accounting/common';

export class BulkDeleteClientsDto {
  @ApiProperty({
    description: 'Array of client IDs to delete',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Musisz wybrać co najmniej jednego klienta' })
  @ArrayMaxSize(100, { message: 'Możesz usunąć maksymalnie 100 klientów naraz' })
  @IsUUID('4', { each: true, message: 'Nieprawidłowy format ID klienta' })
  clientIds!: string[];
}

export class BulkRestoreClientsDto {
  @ApiProperty({
    description: 'Array of client IDs to restore',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Musisz wybrać co najmniej jednego klienta' })
  @ArrayMaxSize(100, { message: 'Możesz przywrócić maksymalnie 100 klientów naraz' })
  @IsUUID('4', { each: true, message: 'Nieprawidłowy format ID klienta' })
  clientIds!: string[];
}

export class BulkEditClientsDto {
  @ApiProperty({
    description: 'Array of client IDs to edit',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Musisz wybrać co najmniej jednego klienta' })
  @ArrayMaxSize(100, { message: 'Możesz edytować maksymalnie 100 klientów naraz' })
  @IsUUID('4', { each: true, message: 'Nieprawidłowy format ID klienta' })
  clientIds!: string[];

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Employment type to set' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: VatStatus, description: 'VAT status to set' })
  @IsOptional()
  @IsEnum(VatStatus)
  vatStatus?: VatStatus;

  @ApiPropertyOptional({ enum: TaxScheme, description: 'Tax scheme to set' })
  @IsOptional()
  @IsEnum(TaxScheme)
  taxScheme?: TaxScheme;

  @ApiPropertyOptional({ enum: ZusStatus, description: 'ZUS status to set' })
  @IsOptional()
  @IsEnum(ZusStatus)
  zusStatus?: ZusStatus;

  @ApiPropertyOptional({ description: 'Whether clients should receive email copies' })
  @IsOptional()
  @IsBoolean()
  receiveEmailCopy?: boolean;

  @ApiPropertyOptional({
    description: 'PKD code (Polska Klasyfikacja Działalności) to set',
    example: '62.01.Z',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(PKD_CODE_REGEX, { message: PKD_CODE_VALIDATION_MESSAGE })
  pkdCode?: string;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Number of successfully affected records' })
  affected!: number;

  @ApiProperty({ description: 'Number of records requested to be affected' })
  requested!: number;

  @ApiPropertyOptional({
    description: 'Unique identifier for this bulk operation, used for audit trail correlation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  bulkOperationId?: string;
}

export class CheckDuplicatesDto {
  @ApiPropertyOptional({ description: 'NIP to check for duplicates' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID' })
  excludeId?: string;

  @ApiPropertyOptional({ description: 'NIP to check for duplicates' })
  @IsOptional()
  nip?: string;

  @ApiPropertyOptional({ description: 'Email to check for duplicates' })
  @IsOptional()
  email?: string;
}

export class DuplicateCheckResultDto {
  @ApiProperty({ description: 'Whether duplicates were found' })
  hasDuplicates!: boolean;

  @ApiProperty({ description: 'Duplicate clients found by NIP' })
  byNip!: DuplicateClientInfo[];

  @ApiProperty({ description: 'Duplicate clients found by email' })
  byEmail!: DuplicateClientInfo[];
}

export class DuplicateClientInfo {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nip?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  isActive!: boolean;
}
