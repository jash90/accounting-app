import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsIn, IsOptional } from 'class-validator';

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

export class StatusDurationQueryDto extends PeriodFilterDto {
  @ApiProperty({ enum: ['blocked', 'cancelled', 'in_review'] })
  @IsIn(['blocked', 'cancelled', 'in_review'])
  status!: string;
}

export class TaskStatusDurationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() statusSince!: string;
  @ApiPropertyOptional() assigneeName?: string;
  @ApiPropertyOptional() clientName?: string;
}

export class TaskStatusDurationStatsDto {
  @ApiProperty({ type: [TaskStatusDurationItemDto] }) longest!: TaskStatusDurationItemDto[];
  @ApiProperty() averageDurationHours!: number;
  @ApiProperty() status!: string;
}

export class StatusDurationFiltersDto extends PeriodFilterDto {
  @IsOptional()
  @IsIn(['blocked', 'cancelled', 'in_review'])
  status?: string;
}
