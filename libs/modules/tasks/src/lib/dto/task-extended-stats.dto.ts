import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsDateString, IsOptional } from 'class-validator';

export class StatsPeriodFilterDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

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

export class EmployeeTaskRankingItemDto {
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiProperty() completedCount!: number;
}

export class EmployeeTaskRankingDto {
  @ApiProperty({ type: [EmployeeTaskRankingItemDto] }) rankings!: EmployeeTaskRankingItemDto[];
}
