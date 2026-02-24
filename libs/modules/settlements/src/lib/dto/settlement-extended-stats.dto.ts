import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsDateString, IsOptional } from 'class-validator';

export class SettlementStatsPeriodFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class SettlementDurationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() month!: number;
  @ApiProperty() year!: number;
  @ApiProperty() durationDays!: number;
  @ApiPropertyOptional() completedAt?: string;
}

export class SettlementCompletionDurationStatsDto {
  @ApiProperty({ type: [SettlementDurationItemDto] }) longest!: SettlementDurationItemDto[];
  @ApiProperty({ type: [SettlementDurationItemDto] }) shortest!: SettlementDurationItemDto[];
  @ApiProperty() averageDurationDays!: number;
}

export class SettlementEmployeeRankingItemDto {
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiProperty() completedCount!: number;
}

export class SettlementEmployeeRankingDto {
  @ApiProperty({ type: [SettlementEmployeeRankingItemDto] })
  rankings!: SettlementEmployeeRankingItemDto[];
}

export class BlockedClientItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() blockCount!: number;
}

export class BlockedClientsStatsDto {
  @ApiProperty({ type: [BlockedClientItemDto] }) clients!: BlockedClientItemDto[];
}
