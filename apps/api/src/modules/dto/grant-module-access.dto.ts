import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantModuleAccessDto {
  @ApiProperty({ example: ['read', 'write', 'delete'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
