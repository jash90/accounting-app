import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class AssignSettlementDto {
  @ApiPropertyOptional({ description: 'User ID to assign, null to unassign' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

export class BulkAssignDto {
  @ApiProperty({ description: 'Array of settlement IDs to assign', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  settlementIds!: string[];

  @ApiProperty({ description: 'User ID to assign settlements to' })
  @IsUUID()
  userId!: string;
}
