import { IsEnum, IsString, IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PermissionTargetType {
  COMPANY = 'company',
  EMPLOYEE = 'employee',
}

export class ManageModulePermissionDto {
  @ApiProperty({
    description: 'Type of target entity (company or employee)',
    enum: PermissionTargetType,
    example: PermissionTargetType.EMPLOYEE,
  })
  @IsEnum(PermissionTargetType)
  targetType: PermissionTargetType;

  @ApiProperty({
    description: 'UUID of the target entity (company or employee)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  targetId: string;

  @ApiProperty({
    description: 'Module slug to grant/update/revoke access',
    example: 'simple-text',
  })
  @IsString()
  moduleSlug: string;

  @ApiPropertyOptional({
    description: 'Array of permissions (required for grant/update operations)',
    example: ['read', 'write', 'delete'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
