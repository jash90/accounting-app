import { ApiPropertyOptional } from '@nestjs/swagger';

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
