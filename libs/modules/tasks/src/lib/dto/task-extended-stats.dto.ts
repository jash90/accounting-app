import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EmployeeRankingDto, EmployeeRankingItemDto, PeriodFilterDto } from '@accounting/common';

// Re-export shared types under module-specific names for backward compatibility
export { PeriodFilterDto as StatsPeriodFilterDto };
export { EmployeeRankingItemDto as EmployeeTaskRankingItemDto };
export { EmployeeRankingDto as EmployeeTaskRankingDto };

export class TaskDurationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() completedAt!: string;
  @ApiPropertyOptional() assigneeName?: string;
}

export class TaskCompletionDurationStatsDto {
  @ApiProperty({ type: [TaskDurationItemDto] }) longest!: TaskDurationItemDto[];
  @ApiProperty({ type: [TaskDurationItemDto] }) shortest!: TaskDurationItemDto[];
  @ApiProperty() averageDurationHours!: number;
}
