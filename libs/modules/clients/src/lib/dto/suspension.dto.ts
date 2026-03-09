import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { SanitizeWithFormatting } from '@accounting/common';

/**
 * DTO for creating a new client suspension.
 */
export class CreateSuspensionDto {
  @ApiProperty({
    description: 'Suspension start date (required)',
    example: '2024-03-01',
  })
  @IsNotEmpty({ message: 'Data zawieszenia jest wymagana' })
  @IsDateString({}, { message: 'Nieprawidłowy format daty zawieszenia' })
  startDate!: string;

  @ApiPropertyOptional({
    description: 'Suspension end date (optional - can be set later)',
    example: '2024-06-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Nieprawidłowy format daty odwieszenia' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for the suspension',
    maxLength: 1000,
    example: 'Zawieszenie działalności na wniosek klienta',
  })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * DTO for updating an existing client suspension.
 */
export class UpdateSuspensionDto {
  @ApiPropertyOptional({
    description: 'Suspension end date (to set or change the resumption date)',
    example: '2024-06-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Nieprawidłowy format daty odwieszenia' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Reason for the suspension',
    maxLength: 1000,
    example: 'Zawieszenie działalności na wniosek klienta - przedłużone',
  })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * Response DTO for a client suspension.
 */
export class SuspensionResponseDto {
  @ApiProperty({ description: 'Suspension ID' })
  id!: string;

  @ApiProperty({ description: 'Client ID' })
  clientId!: string;

  @ApiProperty({ description: 'Client name' })
  clientName!: string;

  @ApiProperty({ description: 'Company ID' })
  companyId!: string;

  @ApiProperty({ description: 'Suspension start date' })
  startDate!: Date;

  @ApiPropertyOptional({ description: 'Suspension end date (resumption date)' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Reason for the suspension' })
  reason?: string;

  @ApiProperty({ description: 'ID of user who created the suspension' })
  createdById!: string;

  @ApiPropertyOptional({ description: 'Name of user who created the suspension' })
  createdByName?: string;

  @ApiProperty({ description: 'Whether the suspension is currently active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
