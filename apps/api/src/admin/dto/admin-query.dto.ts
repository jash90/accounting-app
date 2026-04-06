import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto, UserRole } from '@accounting/common';

/**
 * Query DTO for paginated admin user listing.
 */
export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by email, first name, or last name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user role', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Query DTO for paginated admin company listing.
 */
export class AdminCompaniesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by company name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
