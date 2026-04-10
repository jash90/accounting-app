import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { KsefSessionStatus, KsefSessionType } from '@accounting/common';

export class KsefSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ enum: KsefSessionType })
  sessionType!: KsefSessionType;

  @ApiPropertyOptional()
  ksefSessionRef?: string | null;

  @ApiProperty({ enum: KsefSessionStatus })
  status!: KsefSessionStatus;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  closedAt?: string | null;

  @ApiProperty()
  invoiceCount!: number;

  @ApiPropertyOptional()
  upoReference?: string | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class KsefSessionStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: KsefSessionStatus })
  status!: KsefSessionStatus;

  @ApiProperty()
  invoiceCount!: number;

  @ApiPropertyOptional()
  processedCount?: number;

  @ApiProperty()
  upoAvailable!: boolean;
}
