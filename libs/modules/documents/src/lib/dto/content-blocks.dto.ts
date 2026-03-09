import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import { type ContentBlock } from '@accounting/common';

export class UpdateDocumentContentBlocksDto {
  @ApiPropertyOptional({ description: 'Content blocks for the document template' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsObject({ each: true })
  contentBlocks?: ContentBlock[];

  @ApiPropertyOptional({
    description: 'Document source type',
    enum: ['text', 'blocks'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'blocks'])
  documentSourceType?: 'text' | 'blocks';
}
