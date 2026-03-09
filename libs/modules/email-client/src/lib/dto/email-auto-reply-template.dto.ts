import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmailAutoReplyTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({
    description: 'Category (e.g. CEIDG, VAT, ZUS, PIT, Ogólne)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) triggerKeywords!: string[];
  @ApiPropertyOptional({ enum: ['any', 'all'] })
  @IsOptional()
  @IsIn(['any', 'all'])
  keywordMatchMode?: 'any' | 'all';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() matchSubjectOnly?: boolean;
  @ApiProperty() @IsString() @IsNotEmpty() bodyTemplate!: string;
  @ApiPropertyOptional({ enum: ['formal', 'casual', 'neutral'] })
  @IsOptional()
  @IsIn(['formal', 'casual', 'neutral'])
  tone?: 'formal' | 'casual' | 'neutral';
  @ApiPropertyOptional() @IsOptional() @IsString() customInstructions?: string;
}

export class UpdateEmailAutoReplyTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Category', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerKeywords?: string[];
  @ApiPropertyOptional({ enum: ['any', 'all'] })
  @IsOptional()
  @IsIn(['any', 'all'])
  keywordMatchMode?: 'any' | 'all';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() matchSubjectOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyTemplate?: string;
  @ApiPropertyOptional({ enum: ['formal', 'casual', 'neutral'] })
  @IsOptional()
  @IsIn(['formal', 'casual', 'neutral'])
  tone?: 'formal' | 'casual' | 'neutral';
  @ApiPropertyOptional() @IsOptional() @IsString() customInstructions?: string;
}

export class EmailAutoReplyTemplateResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() category?: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [String] }) triggerKeywords!: string[];
  @ApiProperty() keywordMatchMode!: string;
  @ApiProperty() matchSubjectOnly!: boolean;
  @ApiProperty() bodyTemplate!: string;
  @ApiProperty() tone!: string;
  @ApiPropertyOptional() customInstructions?: string | null;
  @ApiProperty() matchCount!: number;
  @ApiPropertyOptional() lastMatchedAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
