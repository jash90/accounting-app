import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import { type ContentBlock } from '@accounting/common';

export class UpdateContentBlocksDto {
  @ApiPropertyOptional({ description: 'Content blocks for the template' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsObject({ each: true })
  contentBlocks?: ContentBlock[];

  @ApiPropertyOptional({
    description: 'Document source type',
    enum: ['file', 'blocks'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['file', 'blocks'])
  documentSourceType?: 'file' | 'blocks';
}

export class OfferTiptapContentResponseDto {
  @ApiProperty({ description: 'Template display name' })
  name!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'TipTap ProseMirror JSON document',
  })
  tiptapContent?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'Available placeholder keys (from availablePlaceholders)',
  })
  placeholders?: string[] | null;
}

export class UpdateOfferTiptapContentDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'TipTap ProseMirror JSON document',
  })
  @IsObject()
  tiptapContent!: Record<string, unknown>;
}

export class ExportOfferTiptapDocxDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  tiptapContent!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
