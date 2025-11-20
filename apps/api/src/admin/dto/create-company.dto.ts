import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corporation', description: 'Company name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Company owner user ID (must be a user with COMPANY_OWNER role)' })
  @IsUUID()
  ownerId: string;
}

