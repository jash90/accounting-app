import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shared DTO for employee completion ranking results.
 * Used by task and settlement extended stats endpoints.
 */
export class EmployeeRankingItemDto {
  @ApiProperty() userId!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiProperty() completedCount!: number;
}

export class EmployeeRankingDto {
  @ApiProperty({ type: [EmployeeRankingItemDto] }) rankings!: EmployeeRankingItemDto[];
}
