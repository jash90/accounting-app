import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettlementStatsDto {
  @ApiProperty({ description: 'Total settlements for the period' })
  total!: number;

  @ApiProperty({ description: 'Settlements with PENDING status' })
  pending!: number;

  @ApiProperty({ description: 'Settlements with IN_PROGRESS status' })
  inProgress!: number;

  @ApiProperty({ description: 'Settlements with COMPLETED status' })
  completed!: number;

  @ApiProperty({ description: 'Unassigned settlements' })
  unassigned!: number;

  @ApiProperty({ description: 'Settlements requiring attention' })
  requiresAttention!: number;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionRate!: number;
}

export class EmployeeStatsDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty({ description: 'Total assigned settlements' })
  total!: number;

  @ApiProperty({ description: 'Pending settlements' })
  pending!: number;

  @ApiProperty({ description: 'In progress settlements' })
  inProgress!: number;

  @ApiProperty({ description: 'Completed settlements' })
  completed!: number;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionRate!: number;
}

export class EmployeeStatsListDto {
  @ApiProperty({ type: [EmployeeStatsDto] })
  employees!: EmployeeStatsDto[];
}

export class MyStatsDto {
  @ApiProperty({ description: 'My total assigned settlements' })
  total!: number;

  @ApiProperty({ description: 'My pending settlements' })
  pending!: number;

  @ApiProperty({ description: 'My in progress settlements' })
  inProgress!: number;

  @ApiProperty({ description: 'My completed settlements' })
  completed!: number;

  @ApiProperty({ description: 'My completion percentage (0-100)' })
  completionRate!: number;
}
