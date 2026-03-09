import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EmployeeRankingDto, EmployeeRankingItemDto, PeriodFilterDto } from '@accounting/common';

// Re-export shared types under module-specific names for backward compatibility
export { PeriodFilterDto as SettlementStatsPeriodFilterDto };
export { EmployeeRankingItemDto as SettlementEmployeeRankingItemDto };
export { EmployeeRankingDto as SettlementEmployeeRankingDto };

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

export class BlockedClientItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() blockCount!: number;
}

export class BlockedClientsStatsDto {
  @ApiProperty({ type: [BlockedClientItemDto] }) clients!: BlockedClientItemDto[];
}
