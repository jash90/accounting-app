import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({ description: 'Whether comment is internal only', default: true })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
