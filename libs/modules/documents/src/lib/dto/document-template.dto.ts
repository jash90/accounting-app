import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DocumentCategory } from '@accounting/common';

const CATEGORIES: DocumentCategory[] = ['offer', 'contract', 'invoice', 'report', 'other'];

export class CreateDocumentTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ description: 'Handlebars template content with {{placeholder}} syntax' })
  @IsOptional()
  @IsString()
  templateContent?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  placeholders?: string[];
  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: DocumentCategory;
}

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateContent?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  placeholders?: string[];
  // eslint-disable-next-line @darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: DocumentCategory;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class DocumentTemplateResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() templateContent?: string | null;
  @ApiPropertyOptional() templateFileName?: string | null;
  @ApiPropertyOptional() placeholders?: string[] | null;
  @ApiProperty() category!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() companyId!: string;
  @ApiProperty() createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class TiptapContentResponseDto {
  @ApiProperty({ description: 'Template display name' })
  name!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'TipTap ProseMirror JSON document',
  })
  tiptapContent?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  placeholders?: string[] | null;
}

export class UpdateTiptapContentDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'TipTap ProseMirror JSON document',
  })
  @IsObject()
  tiptapContent!: Record<string, unknown>;
}

export class ExportTiptapDocxDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  tiptapContent!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class GenerateDocumentAiDto {
  @ApiProperty({
    description: 'Free-form prompt describing the document to generate',
    minLength: 3,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(2000)
  prompt!: string;
}

export class GenerateDocumentAiResponseDto {
  @ApiProperty({ description: 'Generated HTML content ready to drop into the editor' })
  html!: string;

  @ApiProperty({ description: 'Number of input (prompt) tokens consumed' })
  inputTokens!: number;

  @ApiProperty({ description: 'Number of output (completion) tokens consumed' })
  outputTokens!: number;

  @ApiProperty({ description: 'Total tokens consumed (input + output)' })
  totalTokens!: number;
}
