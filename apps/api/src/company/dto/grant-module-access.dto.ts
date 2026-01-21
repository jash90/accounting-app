import { ApiProperty } from '@nestjs/swagger';

import { IsArray, IsString } from 'class-validator';

export class GrantModuleAccessDto {
  @ApiProperty({ example: ['read', 'write', 'delete'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
