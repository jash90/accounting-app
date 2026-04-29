import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ── Query ────────────────────────────────────────────────────────────────

export class GetKsefAuditLogsQueryDto {
  @ApiPropertyOptional({ description: 'Filtruj po akcji' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ description: 'Filtruj po typie encji' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Data od (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data do (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Numer strony',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Liczba wyników na stronę',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ── Response ─────────────────────────────────────────────────────────────

export class KsefAuditLogUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class KsefAuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional()
  entityType?: string | null;

  @ApiPropertyOptional()
  entityId?: string | null;

  @ApiPropertyOptional()
  httpMethod?: string | null;

  @ApiPropertyOptional()
  httpUrl?: string | null;

  @ApiPropertyOptional()
  httpStatusCode?: number | null;

  @ApiPropertyOptional()
  responseSnippet?: string | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiPropertyOptional()
  durationMs?: number | null;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ type: KsefAuditLogUserSummaryDto })
  user?: KsefAuditLogUserSummaryDto;

  @ApiProperty()
  createdAt!: string;
}
