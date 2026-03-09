import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { SettlementStatus } from '@accounting/common';

export class UpdateSettlementStatusDto {
  @ApiProperty({ enum: SettlementStatus })
  @IsEnum(SettlementStatus)
  status!: SettlementStatus;

  @ApiPropertyOptional({ description: 'Optional notes about the status change' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateSettlementDto {
  @ApiPropertyOptional({ enum: SettlementStatus })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @ApiPropertyOptional({ description: 'Notes about the settlement' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Number of invoices' })
  @IsOptional()
  @IsInt()
  @Min(0)
  invoiceCount?: number;

  @ApiPropertyOptional({ description: 'Documents date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  documentsDate?: string | null;

  @ApiPropertyOptional({ description: 'Priority level (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Deadline date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  deadline?: string | null;

  @ApiPropertyOptional({ description: 'Whether documents are complete' })
  @IsOptional()
  documentsComplete?: boolean;

  @ApiPropertyOptional({ description: 'Whether settlement requires attention' })
  @IsOptional()
  requiresAttention?: boolean;

  @ApiPropertyOptional({ description: 'Reason for requiring attention' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attentionReason?: string | null;
}
