import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateDocumentDto {
  @ApiProperty() @IsUUID() templateId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() placeholderData?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceModule?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sourceEntityId?: string;
}

export class GeneratedDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() fileName?: string | null;
  @ApiPropertyOptional() templateId?: string | null;
  @ApiProperty() companyId!: string;
  @ApiProperty() generatedById!: string;
  @ApiPropertyOptional() sourceModule?: string | null;
  @ApiPropertyOptional() sourceEntityId?: string | null;
  @ApiProperty() createdAt!: Date;
}
