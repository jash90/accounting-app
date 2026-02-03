import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ReliefType, ReliefTypeLabels } from '@accounting/common';

/**
 * DTO for creating a new client relief period.
 */
export class CreateReliefPeriodDto {
  @ApiProperty({
    description: 'Type of relief',
    enum: ReliefType,
    example: ReliefType.ULGA_NA_START,
  })
  @IsNotEmpty({ message: 'Typ ulgi jest wymagany' })
  @IsEnum(ReliefType, { message: 'Nieprawidłowy typ ulgi' })
  reliefType!: ReliefType;

  @ApiProperty({
    description: 'Relief start date (required)',
    example: '2024-03-01',
  })
  @IsNotEmpty({ message: 'Data rozpoczęcia jest wymagana' })
  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  startDate!: string;

  @ApiPropertyOptional({
    description:
      'Relief end date (optional - auto-calculated based on relief type if not provided)',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  endDate?: string;
}

/**
 * DTO for updating an existing client relief period.
 */
export class UpdateReliefPeriodDto {
  @ApiPropertyOptional({
    description: 'Relief start date',
    example: '2024-03-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Relief end date',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Whether the relief is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Pole isActive musi być wartością logiczną' })
  isActive?: boolean;
}

/**
 * Response DTO for a client relief period.
 */
export class ReliefPeriodResponseDto {
  @ApiProperty({ description: 'Relief period ID' })
  id!: string;

  @ApiProperty({ description: 'Client ID' })
  clientId!: string;

  @ApiProperty({ description: 'Client name' })
  clientName!: string;

  @ApiProperty({ description: 'Company ID' })
  companyId!: string;

  @ApiProperty({
    description: 'Type of relief',
    enum: ReliefType,
  })
  reliefType!: ReliefType;

  @ApiProperty({ description: 'Human-readable relief type label' })
  reliefTypeLabel!: string;

  @ApiProperty({ description: 'Relief start date' })
  startDate!: Date;

  @ApiProperty({ description: 'Relief end date' })
  endDate!: Date;

  @ApiPropertyOptional({
    description: 'Days until relief ends (null if already ended)',
    type: Number,
    nullable: true,
  })
  daysUntilEnd?: number | null;

  @ApiProperty({ description: 'Whether the relief is currently active' })
  isActive!: boolean;

  @ApiProperty({ description: 'ID of user who created the relief' })
  createdById!: string;

  @ApiPropertyOptional({ description: 'Name of user who created the relief' })
  createdByName?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

/**
 * Helper function to get label for relief type.
 */
export function getReliefTypeLabel(reliefType: ReliefType): string {
  return ReliefTypeLabels[reliefType] || reliefType;
}
