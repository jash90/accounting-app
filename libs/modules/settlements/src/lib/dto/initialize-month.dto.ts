import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class InitializeMonthDto {
  @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Year', minimum: 2020 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year!: number;
}
