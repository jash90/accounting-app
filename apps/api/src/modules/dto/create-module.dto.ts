import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({ example: 'Invoice Management', description: 'Module display name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'invoice-management', description: 'URL-friendly unique identifier for the module' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Manage invoices, track payments, and generate reports', description: 'Module description' })
  @IsOptional()
  @IsString()
  description?: string;
}
